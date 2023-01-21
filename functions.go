package main

import "errors"

func sum(args ...interface{}) (interface{}, error) {
	sum := 0
	for i := range args {
		sum += args[i].(int)
	}
	return sum, nil
}

func max(args ...interface{}) (interface{}, error) {
	max := -99999999999999
	for i := range args {
		value := args[i].(int)
		if value > max {
			max = value
		}
	}
	if max == -99999999999999 {
		return nil, errors.New("Arguments dont have a max")
	}
	return max, nil
}
