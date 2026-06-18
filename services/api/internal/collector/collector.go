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
}

func New(cfg config.Config, st store.Store, state *cache.StateCache, hub *ws.Hub) *Collector {
	return &Collector{
		cfg:    cfg,
		store:  st,
		cache:  state,
		hub:    hub,
		active: make(map[string]collectWorker),
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

	if had && prev.Online && !metric.Online {
		msg := "equipamento offline: " + t.Nome
		isUnidade := t.Tipo == domain.DispositivoPing && t.Porta == 0
		if isUnidade {
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
		if isUnidade {
			go c.pushOfflineAlert(t.Nome, metric.TargetID)
		}
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
