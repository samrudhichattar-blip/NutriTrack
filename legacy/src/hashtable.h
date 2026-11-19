#ifndef HASHTABLE_H
#define HASHTABLE_H

#include <iostream>
#include <vector>
#include <string>

using namespace std;

struct HashNode
{
    string key;
    int productIndex;
    bool occupied;

    HashNode()
    {
        key = "";
        productIndex = -1;
        occupied = false;
    }
};

class HashTable
{
private:
    vector<HashNode> table;
    int tableSize;

    int hashFunction(string key)
    {
        int hash = 0;

        for (int i = 0; i < key.length(); i++)
        {
            hash = (hash * 31 + key[i]) % tableSize;
        }

        return hash;
    }

public:

    HashTable(int size)
    {
        tableSize = size;
        table.resize(tableSize);
    }

    void insert(string key, int productIndex)
    {
        int index = hashFunction(key);

        while (table[index].occupied)
        {
            if (table[index].key == key)
            {
                return;
            }

            index = (index + 1) % tableSize;
        }

        table[index].key = key;
        table[index].productIndex = productIndex;
        table[index].occupied = true;
    }

    int search(string key)
    {
        int index = hashFunction(key);
        int startIndex = index;

        while (table[index].occupied)
        {
            if (table[index].key == key)
            {
                return table[index].productIndex;
            }

            index = (index + 1) % tableSize;

            if (index == startIndex)
            {
                break;
            }
        }

        return -1;
    }
};

#endif