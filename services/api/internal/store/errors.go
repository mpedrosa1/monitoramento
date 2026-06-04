package store

import "errors"

func mongoErrNotFound() error {
	return errors.New("not found")
}

func IsNotFound(err error) bool {
	return err != nil && err.Error() == "not found"
}
