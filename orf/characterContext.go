package orf

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

type CharacterContext struct {
	// TODO - avoid exporting this
	// `interface{}` here is expected to be a "basic" type (string, number, etc), not a ReferencedExpression
	Variables map[string]interface{}
}

func (c *CharacterContext) Put(dotSeparatedPath string, value interface{}) error {
	return c.insertAtPath(dotSeparatedPath, value, c.Variables)
}
func (c *CharacterContext) Get(dotSeparatedPath string) (interface{}, error) {
	return c.getRefValue(dotSeparatedPath, c.Variables)
}

func (c *CharacterContext) ToJson() ([]byte, error) {
	return json.MarshalIndent(c.Variables, "", "  ")
}

// Creates parents along the way
func (c *CharacterContext) insertAtPath(dotSeparatedPath string, value interface{}, m map[string]interface{}) error {
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

func (c *CharacterContext) getRefValue(dotSeparatedPath string, m map[string]interface{}) (interface{}, error) {
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

// TODO - I think I can remove this...
func (c *CharacterContext) Flatten() map[string]interface{} {
	flattened := make(map[string]interface{}, 0)
	Flatten("", c.Variables, flattened)
	return flattened
}

// TODO - this probably needs to move somewhere else...
func Flatten(path string, curr interface{}, flattened map[string]interface{}) {
	switch curr.(type) {
	case map[string]interface{}:
		nested := curr.(map[string]interface{})
		for k, v := range nested {
			prefix := ""
			if path != "" {
				prefix = path + "."
			}
			Flatten(prefix+k, v, flattened)
		}
	default:
		flattened[path] = curr
	}
}
