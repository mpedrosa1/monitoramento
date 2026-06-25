package collector

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/cache"
	"github.com/mmrtec/monitoramento/api/internal/config"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/modbus"
	"github.com/mmrtec/monitoramento/api/internal/ping"
	"github.com/mmrtec/monitoramento/api/internal/push"
	"github.com/mmrtec/monitoramento/api/internal/snmp"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"github.com/mmrtec/monitoramento/api/internal/ws"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const pingFailuresForOffline = 3

type collectWorker struct {
	cancel context.CancelFunc
	single *domain.MonitorTarget
	modbus []domain.MonitorTarget
}

func (w collectWorker) isModbusGroup() bool {
	return len(w.modbus) > 0
}

func collectWorkerEqual(a, b collectWorker) bool {
	if a.isModbusGroup() != b.isModbusGroup() {
		return false
	}
	if a.isModbusGroup() {
		return domain.ModbusTargetGroupEqual(a.modbus, b.modbus)
	}
	return domain.MonitorTargetEqual(*a.single, *b.single)
}

func buildCollectWorkers(targets []domain.MonitorTarget) map[string]collectWorker {
	modbusGroups := make(map[string][]domain.MonitorTarget)
	out := make(map[string]collectWorker, len(targets))

	for _, t := range targets {
		switch t.Tipo {
		case domain.DispositivoModbus:
			key := domain.MonitorModbusEndpointKey(t)
			modbusGroups[key] = append(modbusGroups[key], t)
		default:
			tt := t
			out[t.TargetID] = collectWorker{single: &tt}
		}
	}

	for endpointKey, group := range modbusGroups {
		sort.Slice(group, func(i, j int) bool {
			return group[i].TargetID < group[j].TargetID
		})
		out["modbus:"+endpointKey] = collectWorker{modbus: group}
	}

	return out
}

type Collector struct {
	cfg       config.Config
	store     store.Store
	cache     *cache.StateCache
	hub       *ws.Hub
	parentCtx context.Context
	cancel    context.CancelFunc
	mu        sync.Mutex
	active    map[string]collectWorker
	wg        sync.WaitGroup
	// offlineSince guarda quando cada alvo ficou offline, para calcular há quanto
	// tempo ele estava fora ao voltar a ficar online.
	offlineMu    sync.Mutex
	offlineSince map[string]time.Time

	notificador AlertaNotifier
	// alertas indexa as configurações de alarme por TargetID; alertaAtivo guarda
	// o estado atual (em alarme ou não) por ID de alerta para detectar transições.
	alertasMu   sync.RWMutex
	alertas     map[string][]domain.AlertaEquipamento
	alertaAtivo map[string]bool
}

// AlertaNotifier entrega um alerta de equipamento a todos os usuários do sistema
// (notificação in-app + push). Implementado pela camada HTTP/API.
type AlertaNotifier interface {
	NotificarAlertaEquipamento(titulo, mensagem string, tipo domain.NotificacaoTipo, payload domain.NotificacaoPayload)
}

// SetNotificador injeta o entregador de notificações (chamado após criar a API).
func (c *Collector) SetNotificador(n AlertaNotifier) {
	c.notificador = n
}

func New(cfg config.Config, st store.Store, state *cache.StateCache, hub *ws.Hub) *Collector {
	return &Collector{
		cfg:          cfg,
		store:        st,
		cache:        state,
		hub:          hub,
		active:       make(map[string]collectWorker),
		offlineSince: make(map[string]time.Time),
		alertas:      make(map[string][]domain.AlertaEquipamento),
		alertaAtivo:  make(map[string]bool),
	}
}

func (c *Collector) Start(ctx context.Context) {
	modbus.Configure(
		time.Duration(c.cfg.ModbusTimeoutMs)*time.Millisecond,
		time.Duration(c.cfg.ModbusReadDelayMs)*time.Millisecond,
	)
	if !c.cfg.CollectorEnabled {
		log.Println("collector: desabilitado (COLLECTOR_ENABLED=false)")
		return
	}
	log.Printf("collector: ativo — ping=%ds modbus=%ds (timeout=%dms delay=%dms) snmp=%ds",
		c.cfg.PingIntervalSec,
		c.cfg.ModbusIntervalSec,
		c.cfg.ModbusTimeoutMs,
		c.cfg.ModbusReadDelayMs,
		c.cfg.SNMPIntervalSec,
	)
	c.parentCtx, c.cancel = context.WithCancel(ctx)
	c.RefreshTargets()
	c.RefreshAlertas()
}

// RefreshTargets recarrega alvos (ex.: após criar/editar/excluir unidade).
func (c *Collector) RefreshTargets() {
	if !c.cfg.CollectorEnabled || c.parentCtx == nil {
		return
	}
	targets, err := store.ListMonitorTargets(c.parentCtx, c.store)
	if err != nil {
		log.Printf("collector: list targets: %v", err)
		return
	}

	want := buildCollectWorkers(targets)

	c.mu.Lock()
	defer c.mu.Unlock()

	started := 0
	restarted := 0
	changed := make(map[string]bool)

	for id, w := range c.active {
		cur, ok := want[id]
		if !ok {
			w.cancel()
			delete(c.active, id)
			continue
		}
		if !collectWorkerEqual(w, cur) {
			w.cancel()
			delete(c.active, id)
			changed[id] = true
			restarted++
		}
	}

	for id, w := range want {
		if _, ok := c.active[id]; ok {
			continue
		}
		if !changed[id] {
			started++
		}
		tctx, cancel := context.WithCancel(c.parentCtx)
		w.cancel = cancel
		c.active[id] = w
		c.wg.Add(1)
		if w.isModbusGroup() {
			go c.monitorModbusEndpoint(tctx, w.modbus)
		} else {
			go c.monitorTarget(tctx, *w.single)
		}
	}

	var pingHosts int
	for _, t := range targets {
		if t.Tipo == domain.DispositivoPing {
			pingHosts++
		}
	}
	log.Printf("collector: %d workers ativos (+%d novos, %d reiniciados, %d ping ICMP)",
		len(c.active), started, restarted, pingHosts)
}

func (c *Collector) Stop() {
	if c.cancel != nil {
		c.cancel()
	}
	c.mu.Lock()
	for _, w := range c.active {
		w.cancel()
	}
	c.active = make(map[string]collectWorker)
	c.mu.Unlock()
	c.wg.Wait()
}

func (c *Collector) monitorTarget(ctx context.Context, t domain.MonitorTarget) {
	defer c.wg.Done()
	interval := c.targetInterval(t)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	if t.Tipo == domain.DispositivoPing {
		log.Printf("[ping] monitorando %s — host=%s a cada %s", pingTargetLabel(t), t.Host, interval)
	}
	defer func() {
		if t.Tipo == domain.DispositivoPing {
			log.Printf("[ping] encerrado: %s (%s)", pingTargetLabel(t), t.Host)
		}
	}()

	var consecutiveFailures int

	run := func() {
		var metric domain.DeviceMetric
		switch t.Tipo {
		case domain.DispositivoPing:
			probeOK, lat := ping.Probe(ctx, t.Host)
			reportedOnline := pingReportedOnline(probeOK, &consecutiveFailures, pingFailuresForOffline)
			metric = ping.MetricFromTarget(t, reportedOnline, lat)
			logPingResult(t, probeOK, reportedOnline, consecutiveFailures, lat)
		case domain.DispositivoSNMP:
			if !c.unidadeHostOnline(t.UnidadeID) {
				return
			}
			online, vals := snmp.Probe(t)
			metric = snmp.MetricFromTarget(t, online, vals)
		default:
			return
		}
		c.publishMetric(ctx, t, metric)
	}

	run()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run()
		}
	}
}

func (c *Collector) monitorModbusEndpoint(ctx context.Context, targets []domain.MonitorTarget) {
	defer c.wg.Done()
	if len(targets) == 0 {
		return
	}

	interval := c.targetInterval(targets[0])
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	run := func() {
		if !c.unidadeHostOnline(targets[0].UnidadeID) {
			return
		}
		results := modbus.ProbeEndpoint(ctx, targets)
		for _, r := range results {
			metric := modbus.MetricFromTarget(r.Target, r.Online, r.Valores)
			c.publishMetric(ctx, r.Target, metric)
		}
	}

	run()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run()
		}
	}
}

func (c *Collector) targetInterval(t domain.MonitorTarget) time.Duration {
	interval := time.Duration(t.IntervaloS) * time.Second
	if interval <= 0 {
		switch t.Tipo {
		case domain.DispositivoPing:
			interval = time.Duration(c.cfg.PingIntervalSec) * time.Second
		case domain.DispositivoModbus:
			interval = time.Duration(c.cfg.ModbusIntervalSec) * time.Second
		default:
			interval = time.Duration(c.cfg.SNMPIntervalSec) * time.Second
		}
	}
	return interval
}

func (c *Collector) publishMetric(ctx context.Context, t domain.MonitorTarget, metric domain.DeviceMetric) {
	prev, had := c.cache.Get(metric.TargetID)
	if t.Tipo == domain.DispositivoSNMP || t.Tipo == domain.DispositivoModbus {
		base := prev.UltimosValores
		if base == nil && had {
			base = prev.Valores
		}
		if c.unidadeHostOnline(t.UnidadeID) && metric.Online {
			merged := mergeUltimosValores(base, metric.Valores)
			if len(merged) > 0 {
				metric.UltimosValores = merged
			}
		} else if had && len(prev.UltimosValores) > 0 {
			metric.UltimosValores = prev.UltimosValores
		}
	}
	c.cache.Set(metric)
	c.hub.BroadcastUpdate(metric)

	isUnidade := t.Tipo == domain.DispositivoPing && t.Porta == 0
	alvo := "equipamento"
	if isUnidade {
		alvo = "unidade"
	}
	unidadeID := t.UnidadeID.Hex()
	if had && prev.Online && !metric.Online {
		// Transição online → offline.
		c.marcarOffline(metric.TargetID, time.Now())
		evento := domain.EventoMonitoramento{
			DispositivoID: t.EquipamentoID,
			Tipo:          string(t.Tipo),
			Severidade:    "alta",
			Mensagem:      alvo + " offline: " + t.Nome,
			Dados: map[string]any{
				"host":      t.Host,
				"porta":     t.Porta,
				"status":    "offline",
				"nome":      t.Nome,
				"unidadeId": unidadeID,
			},
		}
		if err := c.store.CreateEvento(ctx, &evento); err == nil {
			c.hub.BroadcastEvento(evento)
		}
		if isUnidade {
			go c.pushOfflineAlert(t.Nome, metric.TargetID)
		}
	} else if had && !prev.Online && metric.Online {
		// Transição offline → online (restabelecimento).
		dados := map[string]any{
			"host":      t.Host,
			"porta":     t.Porta,
			"status":    "online",
			"nome":      t.Nome,
			"unidadeId": unidadeID,
		}
		msg := alvo + " online novamente: " + t.Nome
		if inicio, ok := c.consumirOffline(metric.TargetID); ok {
			d := time.Since(inicio)
			if d < 0 {
				d = 0
			}
			dados["offlineDesde"] = inicio.UTC().Format(time.RFC3339)
			dados["offlineSegundos"] = int(d.Seconds())
			msg += " (ficou " + formatDuracaoOffline(d) + " offline)"
		}
		evento := domain.EventoMonitoramento{
			DispositivoID: t.EquipamentoID,
			Tipo:          string(t.Tipo),
			Severidade:    "info",
			Mensagem:      msg,
			Dados:         dados,
		}
		if err := c.store.CreateEvento(ctx, &evento); err == nil {
			c.hub.BroadcastEvento(evento)
		}
	}

	c.avaliarAlertas(t, metric)
}

func (c *Collector) marcarOffline(targetID string, quando time.Time) {
	c.offlineMu.Lock()
	c.offlineSince[targetID] = quando
	c.offlineMu.Unlock()
}

func (c *Collector) consumirOffline(targetID string) (time.Time, bool) {
	c.offlineMu.Lock()
	defer c.offlineMu.Unlock()
	t, ok := c.offlineSince[targetID]
	if ok {
		delete(c.offlineSince, targetID)
	}
	return t, ok
}

// formatDuracaoOffline gera um rótulo curto em pt-BR (ex.: "45s", "12min", "2h05min", "1d3h").
func formatDuracaoOffline(d time.Duration) string {
	switch {
	case d < time.Minute:
		return fmt.Sprintf("%ds", int(d.Seconds()))
	case d < time.Hour:
		return fmt.Sprintf("%dmin", int(d.Minutes()))
	case d < 24*time.Hour:
		h := int(d.Hours())
		m := int(d.Minutes()) % 60
		if m == 0 {
			return fmt.Sprintf("%dh", h)
		}
		return fmt.Sprintf("%dh%02dmin", h, m)
	default:
		dias := int(d.Hours()) / 24
		h := int(d.Hours()) % 24
		if h == 0 {
			return fmt.Sprintf("%dd", dias)
		}
		return fmt.Sprintf("%dd%dh", dias, h)
	}
}

func (c *Collector) pushOfflineAlert(nome, targetID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tokens, err := c.store.ListAllPushTokens(ctx)
	if err != nil {
		log.Printf("push offline: listar tokens: %v", err)
		return
	}
	if len(tokens) == 0 {
		return
	}

	title := "Unidade offline"
	body := "unidade offline: " + nome
	data := map[string]string{
		"tipo":     "offline_unidade",
		"targetId": targetID,
	}
	push.SendMobile(ctx, tokens, title, body, data)
}

func (c *Collector) unidadeHostOnline(unidadeID primitive.ObjectID) bool {
	m, ok := c.cache.Get(domain.MonitorUnidadeHostTargetID(unidadeID))
	return ok && m.Online
}

func isTimeoutValue(v any) bool {
	s, ok := v.(string)
	if !ok {
		return false
	}
	lower := strings.ToLower(s)
	return strings.Contains(lower, "timeout") || strings.Contains(lower, "timed out")
}

func mergeUltimosValores(prev, novos map[string]any) map[string]any {
	out := make(map[string]any)
	for k, v := range prev {
		if k == "erro" || isTimeoutValue(v) {
			continue
		}
		out[k] = v
	}
	for k, v := range novos {
		if k == "erro" || isTimeoutValue(v) {
			continue
		}
		out[k] = v
	}
	return out
}

func pingReportedOnline(probeOK bool, failures *int, threshold int) bool {
	if probeOK {
		*failures = 0
		return true
	}
	*failures++
	if *failures >= threshold {
		return false
	}
	return true
}

func pingTargetLabel(t domain.MonitorTarget) string {
	if t.Tipo == domain.DispositivoPing && t.Porta == 0 {
		return fmt.Sprintf("unidade %q", t.Nome)
	}
	return fmt.Sprintf("alvo %q", t.Nome)
}

func logPingResult(t domain.MonitorTarget, probeOK, reportedOnline bool, failures int, latenciaMs float64) {
	probeStatus := "FALHA"
	if probeOK {
		probeStatus = "OK"
	}
	reported := "OFFLINE"
	if reportedOnline {
		reported = "ONLINE"
	}
	lat := ""
	if probeOK && latenciaMs > 0 {
		lat = fmt.Sprintf(" lat=%.0fms", latenciaMs)
	}
	if probeOK == reportedOnline {
		log.Printf("[ping] %s host=%s → %s%s", pingTargetLabel(t), t.Host, reported, lat)
		return
	}
	log.Printf(
		"[ping] %s host=%s → probe=%s reported=%s (falhas consecutivas %d/%d)%s",
		pingTargetLabel(t), t.Host, probeStatus, reported, failures, pingFailuresForOffline, lat,
	)
}
