# xlsMongoDb

Main file is, read.js.
It reads data from input xlsx file (in my case its "EMP Data.xlsx") and updates the mongo database.
data.json is an intermediate file.

"writingToDB_rule.json" is a rule file which specifies the database and collection for which the data will be written to.

Database will be created if it is not present.
In the current database, collection will be created if its not present.
If it finds a matching email id in the data base, it just updates/replaces the attibutes field in the current document.
If it doesnot find a matching email, then it create a new document with fields name, email, username, roles and attributes.
