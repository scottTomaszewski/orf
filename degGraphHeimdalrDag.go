package main

import (
	"errors"
	"fmt"
	"github.com/heimdalr/dag"
	"orf/orf"
)

func HeimdalrDagEvaluate(formulas []orf.DependentFormula) (map[string]interface{}, error) {
	fmt.Printf("Building DAG\n")
	formulaDAG := dag.NewDAG()
	ids := make([]string, 0, len(formulas))

	// Add formula Vertices
	for formulaIndex := range formulas {
		formula := formulas[formulaIndex]
		ids = append(ids, formula.Ref)
		err := formulaDAG.AddVertexByID(formula.Ref, formula.Formula)
		if err != nil {
			return nil, errors.New(fmt.Sprintf("Failed to add formula %s to DAG: %s", formula.Ref, err))
		}

		//refComponents := strings.Split(formula.Ref, ".")
		//fmt.Println(refComponents)
		//path := ""
		//for i := range refComponents {
		//	if path != "" {
		//		path += "." + refComponents[i]
		//	} else {
		//		path += refComponents[i]
		//	}
		//
		// 	vertex := formula.Formula
		//	if path == formula.Ref {
		//		vertex = formula.Formula
		//	}
		//	fmt.Printf("Adding vertex %s with value %s\n", path, vertex)
		//	err := formulaDAG.AddVertexByID(path, vertex)
		//	if err != nil {
		//		fmt.Printf("Failed to add formula %s to DAG: %s", formula.Ref, err)
		//		return
		//	}
		//}
	}

	// Add formula dependencies (needs all vertices before we can do this)
	for formulaIndex := range formulas {
		formula := formulas[formulaIndex]
		for depIndex := range formula.Dependencies {

			//dependencyRef := formula.Dependencies[depIndex]
			//if strings.HasSuffix(dependencyRef, ".*") {
			//	path := strings.Replace(dependencyRef, ".*","", -1)
			//	// find all vertices that match formula.Dependencies[depIndex]
			//	for _, id := range ids {
			//		if id != formula.Ref && strings.HasPrefix(id, path) {
			//			fmt.Printf("Adding special edge from %s to %s\n", id, formula.Ref)
			//			err := formulaDAG.AddEdge(id, formula.Ref)
			//			if err != nil {
			//				fmt.Printf("Failed to add formula dependency from  %s to %s: %s", id, formula.Dependencies[depIndex], err)
			//				return
			//			}
			//		}
			//	}
			//} else {
			err := formulaDAG.AddEdge(formula.Dependencies[depIndex], formula.Ref)
			if err != nil {
				return nil, errors.New(fmt.Sprintf("Failed to add formula dependency "+
					"from  %s to %s: %s", formula.Ref, formula.Dependencies[depIndex], err))
			}
			//}
		}
	}

	fmt.Print(formulaDAG.String())

	fmt.Printf("Loading custom functions\n")
	context := characterContext{variables: make(map[string]interface{}, 8)}
	functions := GetFunctions(context)

	formulaDAG.BFSWalk(&debuggingVisitor{
		context:   context,
		functions: functions,
		dag:       formulaDAG,
	})

	fmt.Printf("Evaluating formulas:\n")
	formulaDAG.BFSWalk(&evaluatingVisitor{
		context:   context,
		functions: functions,
	})
	return context.variables, nil
}
