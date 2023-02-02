package main

import (
	"github.com/stretchr/testify/require"
	"orf/engine"
	"orf/log"
	"os"
	"testing"
)

func TestBob(t *testing.T) {
	log.InitFromConfig(log.Config{
		Level:  log.LevelInfo,
		Format: log.ConsoleFormat,
		Type:   log.Zap,
		Out:    os.Stdout,
	})

	formulaRootDir := "rules/character/formulas"
	defaultsRootDir := "rules/character/defaults"
	characterFile := "bob.json"

	context, err := engine.Run(formulaRootDir, defaultsRootDir, characterFile)
	if err != nil {
		t.Fatalf("Bob failed: %s", err)
	}

	actualJson, err := context.ToJson()
	if err != nil {
		t.Fatalf("Failed to convert data to json: %s", err)
	}

	expectedJson, err := os.ReadFile("expected_bob.json")
	if err != nil {
		t.Fatalf("Failed to load expected output json: %s", err)
	}

	marshal, err := context.ToJson()
	if err != nil {
		t.Fatalf("Failed to convert data to json: %s", err)
	}

	log.Debug(string(marshal))

	require.JSONEq(t, string(expectedJson), string(actualJson))
}
