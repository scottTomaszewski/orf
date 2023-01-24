package main

import (
	"fmt"
	"orf/evaluate"
	"orf/orf"
)

func main() {
	formulaRootDir := "rules/character/formulas"
	defaultsRootDir := "rules/character/defaults"
	characterFile := "bob.json"

	// Load formulas
	orfData, err := orf.FromAllFilesIn(formulaRootDir)
	if err != nil {
		fmt.Printf("Failed to load orf data: %s", err)
		return
	}

	// Load defaults
	orfDefaults, err := orf.FromAllFilesIn(defaultsRootDir)
	if err != nil {
		fmt.Printf("Failed to load orf data: %s", err)
		return
	}
	orfData.Upsert(orfDefaults)

	fmt.Printf("Base Values: %v\n\n", orfData.Variables)

	// Load character
	fmt.Printf("Loading orf data from %s\n", characterFile)
	characterOrf, err := orf.FromFile(characterFile)
	if err != nil {
		fmt.Printf("Failed to load character data: %s", err)
		return
	}

	// Add the character data, overwriting the regular data
	orfData.Upsert(characterOrf)

	fmt.Printf("Base Values: %v\n\n", orfData.Variables)

	contextAsFormulas := From(*orfData)
	//contextAsFormulas.Print()
	context, err := contextAsFormulas.evaluate(evaluate.GoValEvaluator{})
	if err != nil {
		fmt.Printf("Failed to evaluate data: %s", err)
		return
	}

	marshal, err := context.ToJson()
	if err != nil {
		fmt.Printf("Failed to convert data to json: %s", err)
		return
	}

	fmt.Printf("\n\nResult\n=======\n\n")
	fmt.Println(string(marshal))
}
