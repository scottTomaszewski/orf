package main

import (
	"encoding/json"
	"fmt"
)

func main() {
	formulaRootDir := "formulas"
	characterFile := "bob.json"

	formulas, err := loadData(characterFile, formulaRootDir)
	if err != nil {
		fmt.Printf("Failed to load formula data: %s", err)
	}

	orderedFormulas, err := orderTopologically(*formulas)
	if err != nil {
		fmt.Printf("Failed to topologically sort: %s", err)
	}

	context := characterContext{variables: make(map[string]interface{}, 0)}

	err = evaluateAll(orderedFormulas, *formulas, context, GetFunctions(context))
	if err != nil {
		fmt.Printf("Failed to evaluate formulas: %s", err)
		return
	}

	marshal, err := json.MarshalIndent(context.variables, "", "  ")
	if err != nil {
		return
	}

	fmt.Printf("\n\nResult\n=======\n\n")
	fmt.Println(string(marshal))
}
