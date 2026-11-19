#ifndef HEAP_H
#define HEAP_H

#include <iostream>
#include <vector>

using namespace std;

class NutritionHeap
{
private:
    vector<int> heap;
    vector<Product>* products;
    int preference;

    // Returns true if product a should come before product b
    bool hasHigherPriority(int a, int b)
    {
        float valueA;
        float valueB;

        if (preference == 1)
        {
            // Lowest Calories
            valueA = (*products)[a].calories;
            valueB = (*products)[b].calories;

            return valueA < valueB;
        }

        else if (preference == 2)
        {
            // Highest Protein
            valueA = (*products)[a].protein;
            valueB = (*products)[b].protein;

            return valueA > valueB;
        }

        else if (preference == 3)
        {
            // Lowest Sugar
            valueA = (*products)[a].sugar;
            valueB = (*products)[b].sugar;

            return valueA < valueB;
        }

        else if (preference == 4)
        {
            // Highest Fiber
            valueA = (*products)[a].fiber;
            valueB = (*products)[b].fiber;

            return valueA > valueB;
        }

        else
        {
            // Lowest Sodium
            valueA = (*products)[a].sodium;
            valueB = (*products)[b].sodium;

            return valueA < valueB;
        }
    }


    void heapifyUp(int index)
    {
        while (index > 0)
        {
            int parent = (index - 1) / 2;

            if (hasHigherPriority(heap[index], heap[parent]))
            {
                int temp = heap[index];
                heap[index] = heap[parent];
                heap[parent] = temp;

                index = parent;
            }
            else
            {
                break;
            }
        }
    }


    void heapifyDown(int index)
    {
        int size = heap.size();

        while (true)
        {
            int left = 2 * index + 1;
            int right = 2 * index + 2;

            int best = index;

            if (left < size &&
                hasHigherPriority(heap[left], heap[best]))
            {
                best = left;
            }

            if (right < size &&
                hasHigherPriority(heap[right], heap[best]))
            {
                best = right;
            }

            if (best != index)
            {
                int temp = heap[index];
                heap[index] = heap[best];
                heap[best] = temp;

                index = best;
            }
            else
            {
                break;
            }
        }
    }


public:

    NutritionHeap(vector<Product>& productList, int selectedPreference)
    {
        products = &productList;
        preference = selectedPreference;
    }


    void insert(int productIndex)
    {
        heap.push_back(productIndex);

        heapifyUp(heap.size() - 1);
    }


    bool isEmpty()
    {
        return heap.empty();
    }


    int extractTop()
    {
        if (heap.empty())
        {
            return -1;
        }

        int top = heap[0];

        heap[0] = heap[heap.size() - 1];

        heap.pop_back();

        if (!heap.empty())
        {
            heapifyDown(0);
        }

        return top;
    }
};

#endif