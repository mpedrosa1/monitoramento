package rastreamento

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/cache"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/rotaexata"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"github.com/mmrtec/monitoramento/api/internal/ws"
)

type Status struct {
	Configured         bool   `json:"configured"`
	BaseURL            string `json:"baseUrl,omitempty"`
	EmailConfigured    bool   `json:"emailConfigured"`
	LoginOK            bool   `json:"loginOk"`
	LoginError         string `json:"loginError,omitempty"`
	TokenLength        int    `json:"tokenLength,omitempty"`
	PosicoesAPI        int    `json:"posicoesApi,omitempty"`
	PosicoesParseadas  int    `json:"posicoesParseadas,omitempty"`
	PosicoesVinculadas int    `json:"posicoesVinculadas"`
	UltimaSyncOK       bool   `json:"ultimaSyncOk"`
	UltimaSyncErro     string `json:"ultimaSyncErro,omitempty"`
}

type Service struct {
	client   *rotaexata.Client
	cfg      rotaexata.Config
	store    store.Store
	cache    *cache.VeiculoPosicoesCache
	hub      *ws.Hub
	interval time.Duration
	notifier ProximityNotifier
	proximity *proximityChecker
	statusTracker *colaboradorStatusTracker
	condutorNotifier CondutorNotifier

	lastSyncOK  bool
	lastSyncErr string
}

func NewService(cfg rotaexata.Config, st store.Store, hub *ws.Hub, intervalSec int) *Service {
	if intervalSec <= 0 {
		intervalSec = 60
	}
	posCache := cache.NewVeiculoPosicoesCache()
	svc := &Service{
		store:     st,
		cache:     posCache,
		hub:       hub,
		interval:  time.Duration(intervalSec) * time.Second,
		proximity: newProximityChecker(domain.VeiculoProximidadeRaioKm),
		statusTracker: newColaboradorStatusTracker(),
	}
	svc.cfg = cfg
	if cfg.Enabled() {
		svc.client = rotaexata.NewClient(cfg)
		hub.SetVeiculoPosicoesCache(posCache)
	}
	return svc
}

func (s *Service) SetProximityNotifier(n ProximityNotifier) {
	s.notifier = n
}

func (s *Service) Status(ctx context.Context) Status {
	st := Status{
		Configured:         s.Enabled(),
		BaseURL:            strings.TrimSpace(s.cfg.BaseURL),
		EmailConfigured:    strings.TrimSpace(s.cfg.Email) != "",
		PosicoesVinculadas: len(s.cache.Snapshot()),
		UltimaSyncOK:       s.lastSyncOK,
		UltimaSyncErro:     s.lastSyncErr,
	}
	if !s.Enabled() {
		return st
	}
	d := s.client.Diagnose(ctx)
	st.LoginOK = d.LoginOK
	st.LoginError = d.LoginError
	st.TokenLength = d.TokenLength
	st.PosicoesAPI = d.PosicoesAPI
	st.PosicoesParseadas = d.PosicoesParseadas
	return st
}

func (s *Service) Enabled() bool {
	return s.client != nil
}

func (s *Service) Snapshot() []domain.VeiculoPosicao {
	return s.cache.Snapshot()
}

func (s *Service) Start(ctx context.Context) {
	if !s.Enabled() {
		log.Println("rastreamento Rota Exata desabilitado (configure ROTAEXATA_BASE_URL, ROTAEXATA_EMAIL e ROTAEXATA_PASSWORD)")
		return
	}
	log.Printf("rastreamento Rota Exata ativo (intervalo %s)", s.interval)
	go s.loop(ctx)
}

func (s *Service) loop(ctx context.Context) {
	s.syncOnce(ctx)
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.syncOnce(ctx)
		}
	}
}

func (s *Service) syncOnce(ctx context.Context) {
	if s.client == nil {
		return
	}
	rawList, err := s.client.UltimaPosicaoTodos(ctx)
	if err != nil {
		s.lastSyncOK = false
		s.lastSyncErr = err.Error()
		log.Printf("rastreamento: %v", err)
		return
	}
	veiculos, err := s.store.ListVeiculos(ctx)
	if err != nil {
		s.lastSyncOK = false
		s.lastSyncErr = err.Error()
		log.Printf("rastreamento: listar veículos: %v", err)
		return
	}
	byPlaca := make(map[string]domain.Veiculo, len(veiculos))
	for _, v := range veiculos {
		byPlaca[rotaexata.NormalizePlaca(v.Placa)] = v
	}

	out := make([]domain.VeiculoPosicao, 0, len(rawList))
	for _, raw := range rawList {
		v, ok := byPlaca[rotaexata.NormalizePlaca(raw.Placa)]
		if !ok {
			continue
		}
		odometro := raw.OdometroKm
		if raw.AdesaoID > 0 {
			if km, err := s.client.OdometroKmResumoDia(ctx, raw.AdesaoID, ""); err == nil && km > 0 {
				odometro = km
			}
		}
		if odometro <= 0 && v.KmAtual > 0 {
			odometro = float64(v.KmAtual)
		}
		out = append(out, domain.VeiculoPosicao{
			VeiculoID:    v.ID.Hex(),
			Placa:        v.Placa,
			Lat:          raw.Lat,
			Lng:          raw.Lng,
			VelocidadeKm: raw.VelocidadeKm,
			OdometroKm:   odometro,
			DataHora:     raw.DataHora,
			Endereco:     raw.Endereco,
		})
	}

	s.cache.ReplaceAll(out)
	if s.hub != nil {
		s.hub.BroadcastVeiculoPosicoes(out)
	}

	unidades, err := s.store.ListUnidades(ctx)
	if err != nil {
		log.Printf("rastreamento proximidade: listar unidades: %v", err)
	} else {
		s.proximity.check(ctx, out, unidades, s.notifier)
	}

	s.syncColaboradorStatusRastreamento(ctx, out, unidades)
	s.verificarCondutoresSilencioso(ctx)

	s.lastSyncOK = true
	s.lastSyncErr = ""
	log.Printf("rastreamento: sync ok — %d posição(ões) na API, %d vinculada(s) à frota local", len(rawList), len(out))
}

func (s *Service) verificarCondutoresSilencioso(ctx context.Context) {
	if s.client == nil {
		return
	}
	_ = s.VerificarCondutores(ctx)
}
