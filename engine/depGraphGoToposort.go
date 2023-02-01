package engine

import (
	"errors"
	"fmt"
	"github.com/philopon/go-toposort"
	"orf/log"
	"orf/orf"
	"strings"
)

func orderTopologically(formulas ContextAsFormulas) ([]string, error) {
	graph := toposort.NewGraph(8)

	refToFormula := formulas.refToFormula
	for _, formula := range refToFormula {
		inserted := graph.AddNode(formula.Ref)
		if !inserted {
			return nil, errors.New(fmt.Sprintf("Failed to add formula %s to DAG", formula.Ref))
		}
	}

	for _, formula := range refToFormula {
		for depIndex := range formula.Dependencies {
			dependencyRef := formula.Dependencies[depIndex]

			if strings.Contains(dependencyRef, ".*") {
				matches := formulas.FindAllMatching(dependencyRef)
				for _, match := range matches {
					depForm := match.(orf.DependentFormula)
					depRefMatchingWildcard := depForm.Ref
					if depRefMatchingWildcard != formula.Ref {
						log.Debugf("Adding wildcard edge from %s to %s", depRefMatchingWildcard, formula.Ref)
						graph.AddNode(depRefMatchingWildcard)
						graph.AddEdge(depRefMatchingWildcard, formula.Ref)
					}
				}
			} else {
				graph.AddEdge(formula.Dependencies[depIndex], formula.Ref)
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
