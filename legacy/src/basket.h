#ifndef BASKET_H
#define BASKET_H

#include <iostream>
#include <vector>
#include "product.h"

using namespace std;

struct BasketNode
{
    int productIndex;
    float quantity;
    BasketNode* next;

    BasketNode(int index, float qty)
    {
        productIndex = index;
        quantity = qty;
        next = NULL;
    }
};

class GroceryBasket
{
private:
    BasketNode* head;

public:

    GroceryBasket()
    {
        head = NULL;
    }

    // Add product to linked list
    void addProduct(int productIndex, float quantity)
    {
        BasketNode* current = head;

        // If product already exists, increase quantity
        while (current != NULL)
        {
            if (current->productIndex == productIndex)
            {
                current->quantity += quantity;
                return;
            }

            current = current->next;
        }

        // Create new node
        BasketNode* newNode =
            new BasketNode(productIndex, quantity);

        if (head == NULL)
        {
            head = newNode;
        }
        else
        {
            current = head;

            while (current->next != NULL)
            {
                current = current->next;
            }

            current->next = newNode;
        }
    }

    // Remove complete product
void removeProduct(int productIndex)
{
    if (head == NULL)
        return;

    if (head->productIndex == productIndex)
    {
        BasketNode* temp = head;
        head = head->next;
        delete temp;
        return;
    }

    BasketNode* current = head;

    while (current->next != NULL)
    {
        if (current->next->productIndex == productIndex)
        {
            BasketNode* temp = current->next;
            current->next = current->next->next;
            delete temp;
            return;
        }

        current = current->next;
    }
}


// Replace one product with another
bool replaceProduct(int oldProductIndex, int newProductIndex)
{
    BasketNode* current = head;

    while (current != NULL)
    {
        if (current->productIndex == oldProductIndex)
        {
            current->productIndex = newProductIndex;
            return true;
        }

        current = current->next;
    }

    return false;
}


// Change quantity
void changeQuantity(int productIndex, float change)
{
    BasketNode* current = head;

    while (current != NULL)
    {
        if (current->productIndex == productIndex)
        {
            current->quantity += change;

            if (current->quantity < 100)
            {
                current->quantity = 100;
            }

            return;
        }

        current = current->next;
    }
}

    // Set exact quantity
    void setQuantity(int productIndex, float quantity)
    {
        BasketNode* current = head;

        while (current != NULL)
        {
            if (current->productIndex == productIndex)
            {
                current->quantity = quantity;

                if (current->quantity < 100)
                {
                    current->quantity = 100;
                }

                return;
            }

            current = current->next;
        }
    }

    bool containsProduct(int productIndex)
    {
        BasketNode* current = head;

        while (current != NULL)
        {
            if (current->productIndex == productIndex)
                return true;

            current = current->next;
        }

        return false;
    }

    float getQuantity(int productIndex)
    {
        BasketNode* current = head;

        while (current != NULL)
        {
            if (current->productIndex == productIndex)
                return current->quantity;

            current = current->next;
        }

        return 0;
    }

    bool isEmpty()
    {
        return head == NULL;
    }

    BasketNode* getHead()
    {
        return head;
    }

    void displayBasket(vector<Product>& products)
    {
        BasketNode* current = head;

        if (current == NULL)
        {
            cout << "Basket is empty." << endl;
            return;
        }

        cout << "\n========== GROCERY BASKET ==========\n";

        while (current != NULL)
        {
            cout << products[current->productIndex].product_name
                 << " - "
                 << current->quantity
                 << " g"
                 << endl;

            current = current->next;
        }

        cout << "====================================\n";
    }
};

#endif