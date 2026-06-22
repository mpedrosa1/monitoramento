package cache

import (
	"sync"

	"github.com/mmrtec/monitoramento/api/internal/domain"
)

type VeiculoPosicoesCache struct {
	mu    sync.RWMutex
	items map[string]domain.VeiculoPosicao
}

func NewVeiculoPosicoesCache() *VeiculoPosicoesCache {
	return &VeiculoPosicoesCache{items: make(map[string]domain.VeiculoPosicao)}
}

func (c *VeiculoPosicoesCache) ReplaceAll(list []domain.VeiculoPosicao) {
	c.mu.Lock()
	defer c.mu.Unlock()
	next := make(map[string]domain.VeiculoPosicao, len(list))
	for _, p := range list {
		if p.VeiculoID == "" {
			continue
		}
		next[p.VeiculoID] = p
	}
	c.items = next
}

func (c *VeiculoPosicoesCache) Snapshot() []domain.VeiculoPosicao {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make([]domain.VeiculoPosicao, 0, len(c.items))
	for _, p := range c.items {
		out = append(out, p)
	}
	return out
}
