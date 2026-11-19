#ifndef STACK_H
#define STACK_H

#include <iostream>

using namespace std;

struct StackNode
{
    int productIndex;
    int newProductIndex;

    float quantity;

    char operation;

    StackNode* next;

    StackNode(
        int index,
        float qty,
        char op)
    {
        productIndex = index;
        newProductIndex = -1;

        quantity = qty;
        operation = op;

        next = NULL;
    }

    StackNode(
        int oldIndex,
        int newIndex,
        float qty,
        char op)
    {
        productIndex = oldIndex;
        newProductIndex = newIndex;

        quantity = qty;
        operation = op;

        next = NULL;
    }
};


class OperationStack
{
private:

    StackNode* top;


public:

    OperationStack()
    {
        top = NULL;
    }


    // Push normal ADD or REMOVE operation
    void push(
        int productIndex,
        float quantity,
        char operation)
    {
        StackNode* newNode =
            new StackNode(
                productIndex,
                quantity,
                operation
            );

        newNode->next = top;

        top = newNode;
    }


    // Push REPLACE operation
    void pushReplacement(
        int oldProductIndex,
        int newProductIndex,
        float quantity)
    {
        StackNode* newNode =
            new StackNode(
                oldProductIndex,
                newProductIndex,
                quantity,
                'W'
            );

        newNode->next = top;

        top = newNode;
    }


    bool isEmpty()
    {
        return top == NULL;
    }


    StackNode* peek()
    {
        return top;
    }


    void pop()
    {
        if (top == NULL)
        {
            return;
        }

        StackNode* temp = top;

        top = top->next;

        delete temp;
    }
};

#endif