package main

import (
	"errors"
	"fmt"
	"github.com/philopon/go-toposort"
	"strings"
)

func orderTopologically(formulas FormulaData) ([]string, error) {
	graph := toposort.NewGraph(8)

	for _, formula := range formulas.refToFormula {
		inserted := graph.AddNode(formula.Ref)
		if !inserted {
			return nil, errors.New(fmt.Sprintf("Failed to add formula %s to DAG", formula.Ref))
		}
	}

	for _, formula := range formulas.refToFormula {
		for depIndex := range formula.Dependencies {
			dependencyRef := formula.Dependencies[depIndex]

			if strings.HasSuffix(dependencyRef, ".*") {
				// find all formulas that match the dependency ref-wildcard
				depsMatchingWildcard := formulas.GetAllMatchingWildcard(dependencyRef)

				// for each formula that matches the wildcard (other than itself), add an edge
				for _, dependency := range depsMatchingWildcard {
					depRefMatchingWildcard := dependency.Ref
					if depRefMatchingWildcard != formula.Ref {
						fmt.Printf("Adding wildcard edge from %s to %s\n", depRefMatchingWildcard, formula.Ref)
						graph.AddNode(depRefMatchingWildcard)
						graph.AddEdge(depRefMatchingWildcard, formula.Ref)
					}
				}

			} else {
				inserted := graph.AddEdge(formula.Dependencies[depIndex], formula.Ref)
				if !inserted {
					return nil, errors.New(fmt.Sprintf("Failed to add formula dependency from  %s to %s", formula.Ref, formula.Dependencies[depIndex]))
				}
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