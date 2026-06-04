package ping

import (
	"context"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
)

func Probe(ctx context.Context, host string) (online bool, latenciaMs float64) {
	if runtime.GOOS == "windows" {
		return probeWindows(ctx, host)
	}
	return probeUnix(ctx, host)
}

func probeWindows(ctx context.Context, host string) (bool, float64) {
	cmd := exec.CommandContext(ctx, "ping", "-n", "1", "-w", "2000", host)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false, 0
	}
	text := string(out)
	if !strings.Contains(strings.ToLower(text), "ttl=") && !strings.Contains(text, "TTL=") {
		return false, 0
	}
	for _, line := range strings.Split(text, "\n") {
		line = strings.ToLower(line)
		if strings.Contains(line, "tempo") || strings.Contains(line, "time") {
			parts := strings.Split(line, "=")
			if len(parts) >= 2 {
				ms := strings.TrimSpace(strings.Split(parts[len(parts)-1], "ms")[0])
				ms = strings.TrimSpace(ms)
				if v, err := strconv.ParseFloat(strings.Replace(ms, ",", ".", 1), 64); err == nil {
					return true, v
				}
			}
		}
	}
	return true, 0
}

func probeUnix(ctx context.Context, host string) (bool, float64) {
	cmd := exec.CommandContext(ctx, "ping", "-c", "1", "-W", "2", host)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false, 0
	}
	text := string(out)
	for _, line := range strings.Split(text, "\n") {
		if strings.Contains(line, "time=") {
			idx := strings.Index(line, "time=")
			rest := line[idx+5:]
			msStr := strings.Split(rest, " ")[0]
			if v, err := strconv.ParseFloat(msStr, 64); err == nil {
				return true, v
			}
		}
	}
	return strings.Contains(text, "1 received") || strings.Contains(text, "1 packets received"), 0
}

func MetricFromTarget(t domain.MonitorTarget, online bool, latencia float64) domain.DeviceMetric {
	return domain.DeviceMetric{
		TargetID:      t.TargetID,
		EquipamentoID: t.EquipamentoID.Hex(),
		UnidadeID:     t.UnidadeID.Hex(),
		Tipo:          t.Tipo,
		Host:          t.Host,
		Porta:         t.Porta,
		Online:        online,
		LatenciaMs:    latencia,
		UpdatedAt:     time.Now().UTC(),
		DispositivoID: t.TargetID,
	}
}
