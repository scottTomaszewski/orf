package main

import (
	"fmt"
	"orf/evaluate"
	"orf/orf"
)

func main() {
	formulaRootDir := "formulas"
	characterFile := "bob.json"

	orfData, err := orf.FromAllFilesIn(formulaRootDir)
	if err != nil {
		fmt.Printf("Failed to load orf data: %s", err)
		return
	}

	characterOrf, err := orf.FromFile(characterFile)
	if err != nil {
		fmt.Printf("Failed to load character data: %s", err)
		return
	}

	// Add the character data, overwriting the regular data
	orfData.Upsert(characterOrf)

	contextAsFormulas := From(*orfData)
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
