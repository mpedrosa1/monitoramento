package store

import (
	"context"
	"strings"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func ListMonitorTargets(ctx context.Context, st Store) ([]domain.MonitorTarget, error) {
	unidades, err := st.ListUnidades(ctx)
	if err != nil {
		return nil, err
	}
	catalog, err := st.ListEquipamentos(ctx)
	if err != nil {
		return nil, err
	}
	byID := make(map[string]domain.Equipamento, len(catalog))
	for _, e := range catalog {
		byID[e.ID.Hex()] = e
	}

	var targets []domain.MonitorTarget
	for _, u := range unidades {
		host := strings.TrimSpace(u.IP)
		if host == "" {
			continue
		}
		intervalo := u.IntervaloS
		if intervalo <= 0 {
			intervalo = 30
		}
		targets = append(targets, domain.MonitorTarget{
			TargetID:      domain.MonitorUnidadeHostTargetID(u.ID),
			EquipamentoID: primitive.NilObjectID,
			UnidadeID:     u.ID,
			Nome:          u.Nome,
			Tipo:          domain.DispositivoPing,
			Host:          host,
			Porta:         0,
			IntervaloS:    intervalo,
		})
		for _, link := range u.Equipamentos {
			eq, ok := byID[link.EquipamentoID.Hex()]
			if !ok {
				continue
			}
			tipoMon := eq.TipoMonitoramento
			if tipoMon == "" {
				tipoMon = domain.DispositivoModbus
			}
			cfg := eq.Config
			if strings.TrimSpace(link.MaquinaID) != "" {
				slave := link.SlaveID
				if slave <= 0 {
					slave = 1
				}
				cfg.SlaveID = byte(slave)
			} else if cfg.SlaveID == 0 {
				cfg.SlaveID = 1
			}
			targets = append(targets, domain.MonitorTarget{
				TargetID:      domain.MonitorTargetID(u.ID, eq.ID, link.Porta),
				EquipamentoID: eq.ID,
				UnidadeID:     u.ID,
				Nome:          eq.Nome,
				Tipo:          tipoMon,
				Host:          host,
				Porta:         link.Porta,
				IntervaloS:    intervalo,
				Config:        cfg,
			})
		}
	}
	return targets, nil
}
