package collector

import (
	"context"
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
	cfg    config.Config
	store  store.Store
	cache  *cache.StateCache
	hub    *ws.Hub
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

func New(cfg config.Config, st store.Store, state *cache.StateCache, hub *ws.Hub) *Collector {
	return &Collector{cfg: cfg, store: st, cache: state, hub: hub}
}

func (c *Collector) Start(ctx context.Context) {
	if !c.cfg.CollectorEnabled {
		return
	}
	ctx, cancel := context.WithCancel(ctx)
	c.cancel = cancel

	targets, err := store.ListMonitorTargets(ctx, c.store)
	if err != nil {
		log.Printf("collector: list targets: %v", err)
		return
	}
	for _, t := range targets {
		c.wg.Add(1)
		go c.monitorTarget(ctx, t)
	}
	log.Printf("collector: started %d targets", len(targets))
}

func (c *Collector) Stop() {
	if c.cancel != nil {
		c.cancel()
	}
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

	run := func() {
		var metric domain.DeviceMetric
		switch t.Tipo {
		case domain.DispositivoPing:
			online, lat := ping.Probe(ctx, t.Host)
			metric = ping.MetricFromTarget(t, online, lat)
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
			_ = c.store.CreateEvento(ctx, &domain.EventoMonitoramento{
				DispositivoID: t.EquipamentoID,
				Tipo:          string(t.Tipo),
				Severidade:    "alta",
				Mensagem:      "equipamento offline: " + t.Nome,
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
