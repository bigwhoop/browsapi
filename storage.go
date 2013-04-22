package main

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"os"
)

const (
	StorageMaxItems = 50
	RequestLogNS    = "request-log"
)

var (
	storages               = make(map[string]Storage, 0)
	ErrStorageItemNotFound = errors.New("Storage item not found.")
)

type StorageItem struct {
	Key, Value string
}

type StorageItems []*StorageItem

type Storage interface {
	Store(*StorageItem) error
	Retrieve(string) (*StorageItem, error)
	RetrieveAll() (StorageItems, error)
	Clear() error
}

func NewFileStorage(path string) (*FileStorage, error) {
	items := make(StorageItems, 0)

	raw, err := ioutil.ReadFile(path)
	if err == nil {
		if err = json.Unmarshal(raw, &items); err != nil {
			return nil, err
		}
	} else if !os.IsNotExist(err) {
		return nil, err
	}

	return &FileStorage{path, items}, nil
}

type FileStorage struct {
	File  string
	Items StorageItems
}

func (this *FileStorage) dump() error {
	json, err := json.Marshal(this.Items)
	if err != nil {
		return err
	}
	return ioutil.WriteFile(this.File, json, 0755)
}

func (this *FileStorage) Store(item *StorageItem) error {
	this.Items = append(this.Items, item)

	if len(this.Items) > StorageMaxItems {
		start := len(this.Items) - StorageMaxItems
		this.Items = this.Items[start:]
	}

	return this.dump()
}

func (this *FileStorage) Retrieve(key string) (*StorageItem, error) {
	for _, item := range this.Items {
		if item.Key == key {
			return item, nil
		}
	}
	return nil, ErrStorageItemNotFound
}

func (this *FileStorage) RetrieveAll() (StorageItems, error) {
	return this.Items, nil
}

func (this *FileStorage) Clear() error {
	this.Items = make(StorageItems, 0)
	return this.dump()
}
