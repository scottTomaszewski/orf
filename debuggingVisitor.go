package main

import (
	"fmt"
	"github.com/heimdalr/dag"
	"github.com/maja42/goval"
)

type debuggingVisitor struct {
	parameters map[string]interface{}
	functions  map[string]goval.ExpressionFunction
	dag        *dag.DAG
}

func (visitor *debuggingVisitor) Visit(v dag.Vertexer) {
	id, formulaVertex := v.Vertex()
	formula := formulaVertex.(Formula)

	ancestors, err := visitor.dag.GetParents(id)
	if err != nil {
		fmt.Printf("Failed to get descendants for %s: %s", id, err)
	}
	ancestorIDs := make([]string, 0, len(ancestors))
	for as := range ancestors {
		ancestorIDs = append(ancestorIDs, as)
	}

	fmt.Printf("%s depends on:\n", formula.Ref)
	fmt.Printf("	- %s\n", ancestorIDs)
}
