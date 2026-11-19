#ifndef NUTRITION_H
#define NUTRITION_H

#include <iostream>
#include <vector>
#include "product.h"
#include "basket.h"

using namespace std;

struct NutritionTotal
{
    float calories;
    float protein;
    float carbohydrates;
    float sugar;
    float fat;
    float fiber;
    float sodium;

    NutritionTotal()
    {
        calories = 0;
        protein = 0;
        carbohydrates = 0;
        sugar = 0;
        fat = 0;
        fiber = 0;
        sodium = 0;
    }
};


NutritionTotal calculateBasketNutrition(
    BasketNode* head,
    vector<Product>& products)
{
    NutritionTotal total;

    BasketNode* current = head;

    while (current != NULL)
    {
        int index = current->productIndex;

        if (index >= 0 &&
            index < products.size())
        {
            Product p = products[index];

            // Quantity is in grams.
            // Nutrition values are per 100g.

            float factor =
                current->quantity / 100.0f;

            total.calories +=
                p.calories * factor;

            total.protein +=
                p.protein * factor;

            total.carbohydrates +=
                p.carbohydrates * factor;

            total.sugar +=
                p.sugar * factor;

            total.fat +=
                p.fat * factor;

            total.fiber +=
                p.fiber * factor;

            total.sodium +=
                p.sodium * factor;
        }

        current = current->next;
    }

    return total;
}


void displayBasketNutrition(
    BasketNode* head,
    vector<Product>& products)
{
    NutritionTotal total =
        calculateBasketNutrition(
            head,
            products);

    cout << "\n========== BASKET NUTRITION ==========\n";

    cout << "Calories: "
         << total.calories
         << " kcal\n";

    cout << "Protein: "
         << total.protein
         << " g\n";

    cout << "Carbohydrates: "
         << total.carbohydrates
         << " g\n";

    cout << "Sugar: "
         << total.sugar
         << " g\n";

    cout << "Fat: "
         << total.fat
         << " g\n";

    cout << "Fiber: "
         << total.fiber
         << " g\n";

    cout << "Sodium: "
         << total.sodium
         << " g\n";

    cout << "=======================================\n";
}

#endif