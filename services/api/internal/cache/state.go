package cache

import (
	"sync"

	"github.com/mmrtec/monitoramento/api/internal/domain"
)

type StateCache struct {
	mu      sync.RWMutex
	metrics map[string]domain.DeviceMetric
}

func NewStateCache() *StateCache {
	return &StateCache{metrics: make(map[string]domain.DeviceMetric)}
}

func (c *StateCache) Set(m domain.DeviceMetric) {
	c.mu.Lock()
	defer c.mu.Unlock()
	key := m.TargetID
	if key == "" {
		key = m.DispositivoID
	}
	c.metrics[key] = m
}

func (c *StateCache) Get(id string) (domain.DeviceMetric, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	m, ok := c.metrics[id]
	return m, ok
}

func (c *StateCache) Snapshot() []domain.DeviceMetric {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make([]domain.DeviceMetric, 0, len(c.metrics))
	for _, m := range c.metrics {
		out = append(out, m)
	}
	return out
}
