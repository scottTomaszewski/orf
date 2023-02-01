package main

import (
	"orf/engine"
	"orf/log"
	"os"
)

func main() {
	formulaRootDir := "rules/character/formulas"
	defaultsRootDir := "rules/character/defaults"
	characterFile := "bob.json"

	log.InitFromConfig(log.Config{
		Level:  log.LevelInfo,
		Format: log.ConsoleFormat,
		Type:   log.Zap,
		Out:    os.Stdout,
	})

	context, err := engine.Run(formulaRootDir, defaultsRootDir, characterFile)
	if err != nil {
		log.Errorf("Engine failed: %s", err)
		return
	}

	marshal, err := context.ToJson()
	if err != nil {
		log.Errorf("Failed to convert data to json: %s", err)
		return
	}

	log.Info(string(marshal))
}
