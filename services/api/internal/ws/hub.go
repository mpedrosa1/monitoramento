package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mmrtec/monitoramento/api/internal/auth"
	"github.com/mmrtec/monitoramento/api/internal/cache"
	"github.com/mmrtec/monitoramento/api/internal/domain"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Message struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

type Hub struct {
	clients    map[*client]struct{}
	register   chan *client
	unregister chan *client
	broadcast  chan []byte
	cache      *cache.StateCache
	posicoes   *cache.VeiculoPosicoesCache
	mu         sync.RWMutex
}

type client struct {
	hub           *Hub
	conn          *websocket.Conn
	send          chan []byte
	colaboradorID string
}

func NewHub(state *cache.StateCache) *Hub {
	return &Hub{
		clients:    make(map[*client]struct{}),
		register:   make(chan *client),
		unregister: make(chan *client),
		broadcast:  make(chan []byte, 256),
		cache:      state,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = struct{}{}
			h.mu.Unlock()
			h.sendSnapshot(c)
		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}
			h.mu.Unlock()
		case msg := <-h.broadcast:
			h.mu.RLock()
			for c := range h.clients {
				select {
				case c.send <- msg:
				default:
					close(c.send)
					delete(h.clients, c)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) SetVeiculoPosicoesCache(c *cache.VeiculoPosicoesCache) {
	h.posicoes = c
}

func (h *Hub) Broadcast(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case h.broadcast <- data:
	default:
		log.Println("ws: broadcast channel full")
	}
}

func (h *Hub) BroadcastVeiculoPosicoes(list []domain.VeiculoPosicao) {
	msg, err := json.Marshal(Message{Type: "veiculo_posicoes_update", Payload: list})
	if err != nil {
		return
	}
	select {
	case h.broadcast <- msg:
	default:
		log.Println("ws: broadcast veiculo_posicoes channel full")
	}
}

func (h *Hub) BroadcastEvento(evento domain.EventoMonitoramento) {
	h.Broadcast(Message{Type: "evento", Payload: evento})
}

func (h *Hub) BroadcastUpdate(metric domain.DeviceMetric) {
	msg, err := json.Marshal(Message{Type: "update", Payload: metric})
	if err != nil {
		return
	}
	select {
	case h.broadcast <- msg:
	default:
		log.Println("ws: broadcast channel full")
	}
}

func (h *Hub) NotifyColaborador(colaboradorID string, msg Message) {
	if colaboradorID == "" {
		return
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		if c.colaboradorID != colaboradorID {
			continue
		}
		select {
		case c.send <- data:
		default:
		}
	}
}

func (h *Hub) sendSnapshot(c *client) {
	payload := h.cache.Snapshot()
	msg, err := json.Marshal(Message{Type: "snapshot", Payload: payload})
	if err != nil {
		return
	}
	select {
	case c.send <- msg:
	default:
	}
	if h.posicoes != nil {
		pos := h.posicoes.Snapshot()
		posMsg, err := json.Marshal(Message{Type: "veiculo_posicoes_snapshot", Payload: pos})
		if err != nil {
			return
		}
		select {
		case c.send <- posMsg:
		default:
		}
	}
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	colaboradorID := ""
	if claims, ok := auth.ClaimsFromContext(r.Context()); ok {
		colaboradorID = claims.ColaboradorID
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	c := &client{hub: h, conn: conn, send: make(chan []byte, 256), colaboradorID: colaboradorID}
	h.register <- c
	go c.writePump()
	go c.readPump()
}

func (c *client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}

func (c *client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
