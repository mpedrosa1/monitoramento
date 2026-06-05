package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/antenas"
	"github.com/mmrtec/monitoramento/api/internal/cache"
	"github.com/mmrtec/monitoramento/api/internal/collector"
	"github.com/mmrtec/monitoramento/api/internal/config"
	httpapi "github.com/mmrtec/monitoramento/api/internal/http"
	"github.com/mmrtec/monitoramento/api/internal/store"
	"github.com/mmrtec/monitoramento/api/internal/ws"
)

func main() {
	config.LoadEnvFiles()
	cfg := config.Load()

	ctx := context.Background()
	var st store.Store

	if cfg.MongoURI != "" {
		mongoStore, err := store.NewMongoStore(ctx, cfg.MongoURI, cfg.MongoDatabase)
		if err != nil {
			log.Printf("mongo indisponível, usando memória: %v", err)
			st = store.NewMemoryStore()
		} else {
			st = mongoStore
			log.Println("conectado ao MongoDB")
		}
	} else {
		log.Println("MONGODB_URI vazio — store em memória")
		st = store.NewMemoryStore()
	}

	stateCache := cache.NewStateCache()
	hub := ws.NewHub(stateCache)
	go hub.Run()

	col := collector.New(cfg, st, stateCache, hub)
	colCtx, colCancel := context.WithCancel(context.Background())
	col.Start(colCtx)

	var antenasStore *antenas.Store
	if antenasPath := config.ResolveAntenasDBPath(); antenasPath != "" {
		as, err := antenas.Open(antenasPath)
		if err != nil {
			log.Printf("base de antenas indisponível: %v", err)
		} else {
			antenasStore = as
			log.Printf("base de antenas carregada: %s", antenasPath)
		}
	} else {
		log.Println("ANTENAS_DB_PATH não configurado e base/antenas.db não encontrado")
	}

	api := &httpapi.API{Store: st, Cache: stateCache, Collector: col, Antenas: antenasStore}
	router := httpapi.NewRouter(cfg, api, hub)

	addr := ":" + cfg.Port
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("não foi possível abrir a porta %s: %v\n(dica: outra instância da API pode estar rodando — feche o terminal anterior ou use scripts/run-api.ps1)", cfg.Port, err)
	}

	srv := &http.Server{
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("API ouvindo em http://localhost:%s", cfg.Port)
		if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	colCancel()
	col.Stop()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	fmt.Println("API encerrada.")
}
