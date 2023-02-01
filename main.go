package main

import (
	"fmt"
	"orf/engine"
)

func main() {
	formulaRootDir := "rules/character/formulas"
	defaultsRootDir := "rules/character/defaults"
	characterFile := "bob.json"

	context, err := engine.Run(formulaRootDir, defaultsRootDir, characterFile)
	if err != nil {
		fmt.Printf("Engine failed: %s", err)
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
