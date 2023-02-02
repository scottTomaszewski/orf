package engine

import (
	"fmt"
	"orf/evaluate"
	"orf/log"
	"orf/orf"
)

func Run(formulaRootDir string, defaultsRootDir string, characterFile string) (*orf.CharacterContext, error) {
	// Load formulas
	orfData, err := orf.FromAllFilesIn(formulaRootDir)
	if err != nil {
		return nil, fmt.Errorf("failed to load orf formula data: %s", err)
	}

	// Load defaults
	orfDefaults, err := orf.FromAllFilesIn(defaultsRootDir)
	if err != nil {
		return nil, fmt.Errorf("failed to load orf default data: %s", err)
	}
	orfData.Upsert(orfDefaults)

	log.Debugf("Base Values: %v\n", orfData.Variables)

	// Load character
	log.Debugf("Loading orf data from %s", characterFile)
	characterOrf, err := orf.FromJsonFile(characterFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load character data: %s", err)
	}

	// Add the character data, overwriting the regular data
	orfData.Upsert(characterOrf)

	log.Debugf("Base Values: %v\n", orfData.Variables)

	contextAsFormulas := From(*orfData)
	//contextAsFormulas.Print()
	context, err := contextAsFormulas.evaluate(evaluate.GoValEvaluator{})
	if err != nil {
		return nil, fmt.Errorf("failed to evaluate data: %s", err)
	}

	return context, nil
}
