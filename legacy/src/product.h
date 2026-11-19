#ifndef PRODUCT_H
#define PRODUCT_H

#include <string>

using namespace std;

struct Product
{
    string product_id;
    string product_name;
    string generic_name;
    string brand;
    string category;

    float calories;
    float protein;
    float carbohydrates;
    float sugar;
    float fat;
    float saturated_fat;
    float fiber;
    float sodium;
};

#endif