package store

import (
	"context"

	"github.com/mmrtec/monitoramento/api/internal/domain"
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
		if u.IP == "" {
			continue
		}
		for _, link := range u.Equipamentos {
			eq, ok := byID[link.EquipamentoID.Hex()]
			if !ok {
				continue
			}
			tipoMon := eq.TipoMonitoramento
			if tipoMon == "" {
				tipoMon = domain.DispositivoModbus
			}
			intervalo := u.IntervaloS
			if intervalo <= 0 {
				intervalo = 30
			}
			targets = append(targets, domain.MonitorTarget{
				TargetID:      domain.MonitorTargetID(u.ID, eq.ID),
				EquipamentoID: eq.ID,
				UnidadeID:     u.ID,
				Nome:          eq.Nome,
				Tipo:          tipoMon,
				Host:          u.IP,
				Porta:         link.Porta,
				IntervaloS:    intervalo,
				Config:        eq.Config,
			})
		}
	}
	return targets, nil
}
