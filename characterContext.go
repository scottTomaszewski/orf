package main

import (
	"errors"
	"fmt"
	"strings"
)

type characterContext struct {
	variables map[string]interface{}
}

func (c *characterContext) Put(dotSeparatedPath string, value interface{}) error {
	return c.insertAtPath(dotSeparatedPath, value, c.variables)
}
func (c *characterContext) Get(dotSeparatedPath string) (interface{}, error) {
	return c.getRefValue(dotSeparatedPath, c.variables)
}

// Creates parents along the way
func (c *characterContext) insertAtPath(dotSeparatedPath string, value interface{}, m map[string]interface{}) error {
	pathComponents := strings.Split(dotSeparatedPath, ".")
	if 1 == len(pathComponents) {
		m[pathComponents[0]] = value
	} else {
		if _, ok := m[pathComponents[0]]; !ok {
			m[pathComponents[0]] = make(map[string]interface{})
		}
		err := c.insertAtPath(strings.Join(pathComponents[1:], "."), value, m[pathComponents[0]].(map[string]interface{}))
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *characterContext) getRefValue(dotSeparatedPath string, m map[string]interface{}) (interface{}, error) {
	pathComponents := strings.Split(dotSeparatedPath, ".")
	if _, ok := m[pathComponents[0]]; !ok {
		return nil, errors.New(fmt.Sprintf("Failed to find path %s in map", dotSeparatedPath))
	}
	if 1 == len(pathComponents) {
		return m[pathComponents[0]], nil
	} else {
		return c.getRefValue(strings.Join(pathComponents[1:], "."), m[pathComponents[0]].(map[string]interface{}))
	}
}
