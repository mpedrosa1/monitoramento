package collector

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/cache"
	"github.com/mmrtec/monitoramento/api/internal/config"
	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/modbus"
	"github.com/mmrtec/monitoramento/api/internal/ping"
	"github.com/mmrtec/monitoramento/api/internal/snmp"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"github.com/mmrtec/monitoramento/api/internal/ws"
)

type Collector struct {
	cfg       config.Config
	store     store.Store
	cache     *cache.StateCache
	hub       *ws.Hub
	parentCtx context.Context
	cancel    context.CancelFunc
	mu        sync.Mutex
	active    map[string]context.CancelFunc
	wg        sync.WaitGroup
}

func New(cfg config.Config, st store.Store, state *cache.StateCache, hub *ws.Hub) *Collector {
	return &Collector{
		cfg:    cfg,
		store:  st,
		cache:  state,
		hub:    hub,
		active: make(map[string]context.CancelFunc),
	}
}

func (c *Collector) Start(ctx context.Context) {
	if !c.cfg.CollectorEnabled {
		log.Println("collector: desabilitado (COLLECTOR_ENABLED=false)")
		return
	}
	log.Printf("collector: ativo — ping=%ds modbus=%ds snmp=%ds",
		c.cfg.PingIntervalSec, c.cfg.ModbusIntervalSec, c.cfg.SNMPIntervalSec)
	c.parentCtx, c.cancel = context.WithCancel(ctx)
	c.RefreshTargets()
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

	want := make(map[string]domain.MonitorTarget, len(targets))
	for _, t := range targets {
		want[t.TargetID] = t
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	for id, cancel := range c.active {
		if _, ok := want[id]; !ok {
			cancel()
			delete(c.active, id)
		}
	}

	started := 0
	for id, t := range want {
		if _, ok := c.active[id]; ok {
			continue
		}
		tctx, cancel := context.WithCancel(c.parentCtx)
		c.active[id] = cancel
		c.wg.Add(1)
		started++
		go c.monitorTarget(tctx, t)
	}

	var pingHosts int
	for _, t := range want {
		if t.Tipo == domain.DispositivoPing {
			pingHosts++
		}
	}
	log.Printf("collector: %d alvos ativos (+%d novos, %d ping ICMP)", len(c.active), started, pingHosts)
}

func (c *Collector) Stop() {
	if c.cancel != nil {
		c.cancel()
	}
	c.mu.Lock()
	for _, cancel := range c.active {
		cancel()
	}
	c.active = make(map[string]context.CancelFunc)
	c.mu.Unlock()
	c.wg.Wait()
}

func (c *Collector) monitorTarget(ctx context.Context, t domain.MonitorTarget) {
	defer c.wg.Done()
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

	run := func() {
		var metric domain.DeviceMetric
		switch t.Tipo {
		case domain.DispositivoPing:
			online, lat := ping.Probe(ctx, t.Host)
			metric = ping.MetricFromTarget(t, online, lat)
			logPingResult(t, online, lat)
		case domain.DispositivoModbus:
			online, vals := modbus.Probe(ctx, t)
			metric = modbus.MetricFromTarget(t, online, vals)
		case domain.DispositivoSNMP:
			online, vals := snmp.Probe(t)
			metric = snmp.MetricFromTarget(t, online, vals)
		default:
			return
		}
		prev, had := c.cache.Get(metric.TargetID)
		c.cache.Set(metric)
		c.hub.BroadcastUpdate(metric)

		if had && prev.Online && !metric.Online {
			msg := "equipamento offline: " + t.Nome
			if t.Tipo == domain.DispositivoPing && t.Porta == 0 {
				msg = "unidade offline: " + t.Nome
			}
			_ = c.store.CreateEvento(ctx, &domain.EventoMonitoramento{
				DispositivoID: t.EquipamentoID,
				Tipo:          string(t.Tipo),
				Severidade:    "alta",
				Mensagem:      msg,
				Dados: map[string]any{
					"host":  t.Host,
					"porta": t.Porta,
				},
			})
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

func pingTargetLabel(t domain.MonitorTarget) string {
	if t.Tipo == domain.DispositivoPing && t.Porta == 0 {
		return fmt.Sprintf("unidade %q", t.Nome)
	}
	return fmt.Sprintf("alvo %q", t.Nome)
}

func logPingResult(t domain.MonitorTarget, online bool, latenciaMs float64) {
	status := "OFFLINE"
	if online {
		status = "ONLINE"
	}
	lat := ""
	if online && latenciaMs > 0 {
		lat = fmt.Sprintf(" lat=%.0fms", latenciaMs)
	}
	log.Printf("[ping] %s host=%s → %s%s", pingTargetLabel(t), t.Host, status, lat)
}
