# csv2Yaml

This is a project to make a yaml file from a csv.

In order to use the script just run this:

node .\createYamlFromCsv.js input.csv PSG2-2425 1 3 5 4
node .\createYamlFromCsv.js input2.csv PSG2-2425 1 2 3 3

Where:
1. input.csv is the route to your csv
2. PSG2-2425 is the password prefix
3. 1 is the min number of iTop users that a students should have
4. 3 is the max number of iTop users that a students should have
5. 5 is the number of gold clients members that each organization must have
6. 4 is the number of platinum clients members that each organization must have

Please take into account that these params are just an example and it is recommended to introduce reasonable
values in order to preserve consistency in the generated yaml.