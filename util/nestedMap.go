package util

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

type NestedMap struct {
	// TODO - avoid exporting this
	Variables map[string]interface{}
}

func (c *NestedMap) Put(path string, value interface{}) {
	c.insertAtPath(path, value, c.Variables)
}

func (c *NestedMap) Get(path string) (interface{}, error) {
	return c.getRefValue(path, c.Variables)
}

func (c *NestedMap) GetAll(wildcardPath string) (interface{}, error) {
	return c.getRefValues(wildcardPath, c.Variables)
}

func (c *NestedMap) ToJson() ([]byte, error) {
	return json.MarshalIndent(c.Variables, "", "  ")
}

// Creates parents along the way
func (c *NestedMap) insertAtPath(dotSeparatedPath string, value interface{}, m map[string]interface{}) {
	pathComponents := strings.Split(dotSeparatedPath, ".")
	if 1 == len(pathComponents) {
		m[pathComponents[0]] = value
	} else {
		if _, ok := m[pathComponents[0]]; !ok {
			m[pathComponents[0]] = make(map[string]interface{})
		}
		c.insertAtPath(strings.Join(pathComponents[1:], "."), value, m[pathComponents[0]].(map[string]interface{}))
	}
}

func (c *NestedMap) getRefValue(dotSeparatedPath string, m map[string]interface{}) (interface{}, error) {
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

func (c *NestedMap) getRefValues(wildcardPath string, m map[string]interface{}) []interface{} {
	pathComponents := strings.Split(wildcardPath, ".")
	if pathComponents[0] == "*" {
		matches := make([]interface{}, 0)
		for _, v := range m {
			switch v.(type) {
			case map[string]interface{}:
				value := c.getRefValues(strings.Join(pathComponents[1:], "."), v.(map[string]interface{}))
				matches = append(matches, value)
			default:
				matches = append(matches, v)
			}

		}
		return matches
	}

	if _, ok := m[pathComponents[0]]; !ok {
		return nil
	}
	if 1 == len(pathComponents) {
		return []interface{}{m[pathComponents[0]]}
	} else {
		return c.getRefValues(strings.Join(pathComponents[1:], "."), m[pathComponents[0]].(map[string]interface{}))
	}
}

// TODO - I think I can remove this...
func (c *NestedMap) Flatten() map[string]interface{} {
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
