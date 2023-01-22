package main

import (
	"errors"
	"fmt"
	"github.com/philopon/go-toposort"
)

func buildAndSortTopologicalOrdering(formulas FormulaData) ([]string, error) {
	graph := toposort.NewGraph(8)

	for _, formula := range formulas.refToFormula {
		inserted := graph.AddNode(formula.Ref)
		if !inserted {
			return nil, errors.New(fmt.Sprintf("Failed to add formula %s to DAG", formula.Ref))
		}
	}

	for _, formula := range formulas.refToFormula {
		for depIndex := range formula.Dependencies {
			inserted := graph.AddEdge(formula.Dependencies[depIndex], formula.Ref)
			if !inserted {
				return nil, errors.New(fmt.Sprintf("Failed to add formula dependency from  %s to %s", formula.Ref, formula.Dependencies[depIndex]))
			}
		}
	}

	result, ok := graph.Toposort()
	if !ok {
		return nil, errors.New("cycle detected in formula dependency graph")
	}

	//fmt.Println(result)

	return result, nil
}
