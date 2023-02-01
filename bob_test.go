package main

import (
	"github.com/stretchr/testify/require"
	"orf/engine"
	"os"
	"testing"
)

func TestBob(t *testing.T) {
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

	require.JSONEq(t, string(expectedJson), string(actualJson))
}
