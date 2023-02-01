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

func (c *NestedMap) GetAll(wildcardPath string) []interface{} {
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

// Recursion: assumes the wildcardPath is at the height of the root of m
func (c *NestedMap) getRefValues(wildcardPath string, m map[string]interface{}) []interface{} {
	pathComponents := strings.Split(wildcardPath, ".")

	// Handle wildcard as next path component
	if pathComponents[0] == "*" {
		matches := make([]interface{}, 0)
		for _, v := range m {
			switch v.(type) {
			case map[string]interface{}:
				// the nestedMap m has a map at wildcard match v, recurse down passing sub-map (* is not the last path component)
				value := c.getRefValues(strings.Join(pathComponents[1:], "."), v.(map[string]interface{}))
				matches = append(matches, value...)
			default:
				// the nestedMap m has reached a leaf entry with a value, add it (* is the last path component)
				matches = append(matches, v)
			}
		}
		return matches
	}

	if _, ok := m[pathComponents[0]]; !ok {
		// no value exists for this path, return empty slice
		return make([]interface{}, 0)
	}

	if 1 == len(pathComponents) {
		// this path has a value, return it as a single-element slice
		return []interface{}{m[pathComponents[0]]}

	} else {
		// more to the path, recurse down
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
