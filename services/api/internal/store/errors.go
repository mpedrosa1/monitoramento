package store

import (
	"errors"

	"go.mongodb.org/mongo-driver/mongo"
)

func mongoErrNotFound() error {
	return errors.New("not found")
}

func IsNotFound(err error) bool {
	return err != nil && (err.Error() == "not found" || errors.Is(err, mongo.ErrNoDocuments))
}
