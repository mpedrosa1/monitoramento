package snmp

import (
	"strings"
	"time"

	"github.com/gosnmp/gosnmp"
	"github.com/mmrtec/monitoramento/api/internal/domain"
)

type snmpQuery struct {
	Key string
	OID string
}

func resolveQueries(cfg domain.DispositivoConfig) []snmpQuery {
	var out []snmpQuery
	for _, p := range cfg.Pontos {
		if p.Desabilitado || strings.TrimSpace(p.OID) == "" {
			continue
		}
		key := strings.TrimSpace(p.Nome)
		if key == "" {
			key = normalizeOID(p.OID)
		}
		out = append(out, snmpQuery{Key: key, OID: normalizeOID(p.OID)})
	}
	if len(out) > 0 {
		return out
	}
	oids := cfg.OIDs
	if len(oids) == 0 {
		oids = []string{"1.3.6.1.2.1.1.3.0"}
	}
	for _, oid := range oids {
		oid = normalizeOID(oid)
		out = append(out, snmpQuery{Key: oid, OID: oid})
	}
	return out
}

func normalizeOID(oid string) string {
	oid = strings.TrimSpace(oid)
	oid = strings.TrimPrefix(oid, ".")
	return oid
}

func Probe(t domain.MonitorTarget) (online bool, valores map[string]any) {
	community := t.Config.Community
	if community == "" {
		community = "public"
	}
	port := t.Porta
	if port == 0 {
		port = 161
	}
	g := &gosnmp.GoSNMP{
		Target:    t.Host,
		Port:      uint16(port),
		Community: community,
		Version:   gosnmp.Version2c,
		Timeout:   3 * time.Second,
		Retries:   1,
	}
	if err := g.Connect(); err != nil {
		return false, map[string]any{"erro": err.Error()}
	}
	defer g.Conn.Close()

	queries := resolveQueries(t.Config)
	valores = make(map[string]any)
	for _, q := range queries {
		result, err := g.Get([]string{q.OID})
		if err != nil {
			valores[q.Key] = err.Error()
			continue
		}
		for _, v := range result.Variables {
			valores[q.Key] = formatPDU(v)
		}
	}
	return true, valores
}

func formatPDU(v gosnmp.SnmpPDU) any {
	switch v.Type {
	case gosnmp.TimeTicks:
		return v.Value
	case gosnmp.Integer:
		return v.Value
	case gosnmp.OctetString:
		if b, ok := v.Value.([]byte); ok {
			return string(b)
		}
	}
	return v.Value
}

func MetricFromTarget(t domain.MonitorTarget, online bool, valores map[string]any) domain.DeviceMetric {
	return domain.DeviceMetric{
		TargetID:      t.TargetID,
		EquipamentoID: t.EquipamentoID.Hex(),
		UnidadeID:     t.UnidadeID.Hex(),
		Tipo:          t.Tipo,
		Host:          t.Host,
		Porta:         t.Porta,
		Online:        online,
		Valores:       valores,
		UpdatedAt:     time.Now().UTC(),
		DispositivoID: t.TargetID,
	}
}
