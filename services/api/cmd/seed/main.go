package main

import (
	"context"
	"log"
	"os"

	"github.com/mmrtec/monitoramento/api/internal/config"
	"github.com/mmrtec/monitoramento/api/internal/store"
)

func main() {
	config.LoadEnvFiles()
	cfg := config.Load()
	ctx := context.Background()

	if cfg.MongoURI == "" {
		log.Fatal("defina MONGODB_URI para executar o seed")
	}

	mongoStore, err := store.NewMongoStore(ctx, cfg.MongoURI, cfg.MongoDatabase)
	if err != nil {
		log.Fatalf("mongo: %v", err)
	}
	if err := mongoStore.SeedIfEmpty(ctx); err != nil {
		log.Fatalf("seed: %v", err)
	}
	log.Println("seed concluído (ou banco já possuía dados)")
	os.Exit(0)
}
