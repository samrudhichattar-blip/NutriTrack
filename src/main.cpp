//g++ -std=c++11 main.cpp -o NutriTrack.exe -lws2_32
// .\NutriTrack.exe

#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <winsock2.h>
#include <windows.h>

#include "product.h"
#include "hashtable.h"
#include "basket.h"
#include "stack.h"
#include "heap.h"
#include "nutrition.h"
#include "healthscore.h"
#include "server.h"

using namespace std;


// =====================================================
// GLOBAL VARIABLES
// =====================================================

HashTable *productTable;

vector<Product> products;

NutritionGoal userGoal;

GroceryBasket basket;

OperationStack operationStack;


// =====================================================
// NORMALIZE CATEGORY
// =====================================================

string normalizeCategory(string category)
{
    if (category == "Rice/Grains/Flour" ||
        category == "Rice, Grains & Flour")
    {
        return "Rice, Grains & Flour";
    }

    if (category == "Bread/Bakery" ||
        category == "Bread & Bakery")
    {
        return "Bread & Bakery";
    }

    if (category == "Pulses/Legumes" ||
        category == "Pulses & Legumes")
    {
        return "Pulses & Legumes";
    }

    if (category == "Nuts/Seeds" ||
        category == "Nuts & Seeds")
    {
        return "Nuts & Seeds";
    }

    if (category == "Cereals/Breakfast" ||
        category == "Cereals & Breakfast")
    {
        return "Cereals & Breakfast";
    }

    if (category == "Beverages" ||
        category == "Beverage" ||
        category == "Drinks")
    {
        return "Beverages";
    }

    if (category == "Vegetable" ||
        category == "Vegetables")
    {
        return "Vegetables";
    }

    if (category == "Fruit" ||
        category == "Fruits")
    {
        return "Fruits";
    }

    if (category == "Snack" ||
        category == "Snacks")
    {
        return "Snacks";
    }

    if (category == "Dairy")
    {
        return "Dairy";
    }

    return category;
}


// =====================================================
// STRING TO FLOAT
// =====================================================

float toFloat(string value)
{
    if (value == "" ||
        value == "NA")
    {
        return 0;
    }

    try
    {
        return stof(value);
    }
    catch (...)
    {
        return 0;
    }
}


// =====================================================
// LOAD PRODUCTS FROM CSV
// =====================================================

void loadProducts()
{
    ifstream file(
        "../data/products_clean.csv");

    if (!file)
    {
        cout << "\nError: products_clean.csv not found."
             << endl;

        return;
    }

    string line;

    // Skip header
    getline(file, line);


    while (getline(file, line))
    {
        vector<string> data;

        string value = "";

        bool insideQuotes = false;


        // CSV parser
        for (int i = 0;
             i < line.length();
             i++)
        {
            char ch = line[i];

            if (ch == '"')
            {
                insideQuotes =
                    !insideQuotes;
            }

            else if (ch == ',' &&
                     !insideQuotes)
            {
                data.push_back(value);

                value = "";
            }

            else
            {
                value += ch;
            }
        }


        // Add last value
        data.push_back(value);


        /*
            CSV FORMAT

            0  product_id
            1  product_name
            2  generic_name
            3  brand
            4  category
            5  barcode
            6  serving_size
            7  quantity
            8  quantity_unit
            9  calories_100g
            10 protein_100g
            11 carbohydrates_100g
            12 sugar_100g
            13 fat_100g
            14 saturated_fat_100g
            15 fiber_100g
            16 sodium_100g
            17 source
            18 source_url
            19 last_modified
        */


        if (data.size() < 17)
        {
            continue;
        }


        Product p;


        // Product information

        p.product_id =
            data[0];

        p.product_name =
            data[1];

        p.generic_name =
            data[2];

        p.brand =
            data[3];

        p.category =
            normalizeCategory(
                data[4]);


        // Nutrition information

        p.calories =
            toFloat(data[9]);

        p.protein =
            toFloat(data[10]);

        p.carbohydrates =
            toFloat(data[11]);

        p.sugar =
            toFloat(data[12]);

        p.fat =
            toFloat(data[13]);

        p.saturated_fat =
            toFloat(data[14]);

        p.fiber =
            toFloat(data[15]);

        p.sodium =
            toFloat(data[16]);


        products.push_back(p);
    }


    file.close();


    cout << "\n"
         << products.size()
         << " products loaded successfully."
         << endl;
}


// =====================================================
// DISPLAY PRODUCT
// =====================================================

void displayProduct(int index)
{
    Product p =
        products[index];


    cout << "\n========================================";

    cout << "\n          PRODUCT DETAILS";

    cout << "\n========================================";


    cout << "\nName       : "
         << p.product_name;

    cout << "\nBrand      : "
         << p.brand;

    cout << "\nCategory   : "
         << p.category;


    cout << "\n\nNutrition per 100g:";


    cout << "\nCalories   : "
         << p.calories
         << " kcal";


    cout << "\nProtein    : "
         << p.protein
         << " g";


    cout << "\nCarbs      : "
         << p.carbohydrates
         << " g";


    cout << "\nSugar      : "
         << p.sugar
         << " g";


    cout << "\nFat        : "
         << p.fat
         << " g";


    cout << "\nSat. Fat   : "
         << p.saturated_fat
         << " g";


    cout << "\nFiber      : "
         << p.fiber
         << " g";


    cout << "\nSodium     : "
         << p.sodium
         << " mg";


    cout << "\n========================================\n";
}


// =====================================================
// GET PRODUCTS OF CATEGORY
// =====================================================

vector<int> getCategoryProducts(
    string category)
{
    vector<int> result;

    string requiredCategory =
        normalizeCategory(category);


    for (int i = 0;
         i < products.size();
         i++)
    {
        if (normalizeCategory(
                products[i].category)
            ==
            requiredCategory)
        {
            result.push_back(i);
        }
    }


    return result;
}


// =====================================================
// DISPLAY PRODUCT LIST
// =====================================================

void displayProductList(
    vector<int> productIndexes)
{
    if (productIndexes.empty())
    {
        cout << "\nNo products found in this category."
             << endl;

        return;
    }


    cout << "\n========================================";

    cout << "\n               PRODUCTS";

    cout << "\n========================================";


    for (int i = 0;
         i < productIndexes.size();
         i++)
    {
        int index =
            productIndexes[i];


        cout << "\n"
             << i + 1
             << ". "
             << products[index].product_name;
    }


    cout << "\n========================================";
}


// =====================================================
// NUTRITION PREFERENCE MENU
// =====================================================

int nutritionPreferenceMenu()
{
    int choice;


    cout << "\n";

    cout << "\n========== SELECT PREFERENCE ==========";

    cout << "\n1. Lowest Calories";

    cout << "\n2. Highest Protein";

    cout << "\n3. Lowest Sugar";

    cout << "\n4. Highest Fiber";

    cout << "\n5. Lowest Sodium";

    cout << "\n6. Back";


    cout << "\n\nEnter choice: ";

    cin >> choice;


    return choice;
}


// =====================================================
// GET HEAP RECOMMENDATIONS
// =====================================================

vector<int> getHeapRecommendations(
    vector<int> categoryProducts,
    int preference)
{
    vector<int> recommendations;


    NutritionHeap heap(
        products,
        preference);


    for (int i = 0;
         i < categoryProducts.size();
         i++)
    {
        heap.insert(
            categoryProducts[i]);
    }


    int count = 0;


    while (!heap.isEmpty() &&
           count < 5)
    {
        int index =
            heap.extractTop();


        recommendations.push_back(
            index);


        count++;
    }


    return recommendations;
}


// =====================================================
// DISPLAY RECOMMENDATIONS
// =====================================================

void displayRecommendations(
    vector<int> recommendations,
    int preference)
{
    if (recommendations.empty())
    {
        cout << "\nNo recommendations available."
             << endl;

        return;
    }


    cout << "\n";

    cout << "\n========== RECOMMENDED OPTIONS ==========";


    for (int i = 0;
         i < recommendations.size();
         i++)
    {
        int index =
            recommendations[i];


        cout << "\n\n"
             << i + 1
             << ". "
             << products[index].product_name;


        if (preference == 1)
        {
            cout << "\n   Calories: "
                 << products[index].calories
                 << " kcal/100g";
        }

        else if (preference == 2)
        {
            cout << "\n   Protein: "
                 << products[index].protein
                 << " g/100g";
        }

        else if (preference == 3)
        {
            cout << "\n   Sugar: "
                 << products[index].sugar
                 << " g/100g";
        }

        else if (preference == 4)
        {
            cout << "\n   Fiber: "
                 << products[index].fiber
                 << " g/100g";
        }

        else if (preference == 5)
        {
            cout << "\n   Sodium: "
                 << products[index].sodium
                 << " mg/100g";
        }
    }


    cout << "\n=========================================\n";
}


// =====================================================
// REPLACE BASKET PRODUCT
// =====================================================

void replaceBasketProduct(
    int oldProductIndex,
    vector<int> recommendations)
{
    if (!basket.containsProduct(
            oldProductIndex))
    {
        cout << "\nThis product is not currently "
             << "in your basket."
             << endl;


        cout << "Add it to the basket first "
             << "before replacing it."
             << endl;


        return;
    }


    cout << "\nCurrent product:";

    cout << "\n"
         << products[oldProductIndex].product_name;


    cout << "\n\nSelect a replacement:";


    for (int i = 0;
         i < recommendations.size();
         i++)
    {
        cout << "\n"
             << i + 1
             << ". "
             << products[
                    recommendations[i]]
                    .product_name;
    }


    cout << "\n0. Cancel";


    int choice;


    cout << "\n\nEnter choice: ";

    cin >> choice;


    if (choice == 0)
    {
        cout << "\nReplacement cancelled."
             << endl;

        return;
    }


    if (choice < 1 ||
        choice > recommendations.size())
    {
        cout << "\nInvalid choice."
             << endl;

        return;
    }


    int newProductIndex =
        recommendations[
            choice - 1];


    float quantity =
        basket.getQuantity(
            oldProductIndex);


    cout << "\nReplacing:";


    cout << "\nOld product: "
         << products[
                oldProductIndex]
                .product_name;


    cout << "\nNew product: "
         << products[
                newProductIndex]
                .product_name;


    cout << "\nQuantity kept: "
         << quantity
         << " g";


    // ---- WHAT-IF: capture basket nutrition BEFORE the swap ----
    NutritionTotal beforeTotal =
        calculateBasketNutrition(
            basket.getHead(),
            products);


    bool replaced =
        basket.replaceProduct(
            oldProductIndex,
            newProductIndex);


    if (replaced)
    {
        operationStack.pushReplacement(
            oldProductIndex,
            newProductIndex,
            quantity);


        cout << "\nReplacement completed."
             << endl;


        // ---- WHAT-IF: capture basket nutrition AFTER the swap ----
        NutritionTotal afterTotal =
            calculateBasketNutrition(
                basket.getHead(),
                products);

        displayWhatIfComparison(
            beforeTotal,
            afterTotal,
            userGoal);
    }
}


// =====================================================
// SHOW RECOMMENDATIONS
// =====================================================

void showRecommendations(
    int productIndex,
    vector<int> categoryProducts)
{
    int preference =
        nutritionPreferenceMenu();


    if (preference == 6)
    {
        return;
    }


    if (preference < 1 ||
        preference > 5)
    {
        cout << "\nInvalid choice."
             << endl;

        return;
    }


    vector<int> filteredProducts;


    for (int i = 0;
         i < categoryProducts.size();
         i++)
    {
        if (categoryProducts[i] !=
            productIndex)
        {
            filteredProducts.push_back(
                categoryProducts[i]);
        }
    }


    vector<int> recommendations =
        getHeapRecommendations(
            filteredProducts,
            preference);


    displayRecommendations(
        recommendations,
        preference);


    if (basket.containsProduct(
            productIndex))
    {
        cout << "\nThis product is currently "
             << "in your basket.";


        cout << "\nDo you want to replace it "
             << "with a recommended option?";


        cout << "\n1. Yes";

        cout << "\n2. No";


        int choice;


        cout << "\n\nEnter choice: ";

        cin >> choice;


        if (choice == 1)
        {
            replaceBasketProduct(
                productIndex,
                recommendations);
        }

        else
        {
            cout << "\nNo replacement made."
                 << endl;
        }
    }

    else
    {
        cout << "\n----------------------------------------";

        cout << "\nThis product is NOT currently "
             << "in your basket.";


        cout << "\nAdd this product to your basket "
             << "first if you want to replace it.";


        cout << "\n----------------------------------------\n";
    }
}


// =====================================================
// SELECTED PRODUCT MENU
// =====================================================

void selectedProductMenu(
    int productIndex,
    vector<int> categoryProducts)
{
    while (true)
    {
        cout << "\n";

        cout << "\n========== PRODUCT MENU ==========";


        cout << "\nSelected Product: "
             << products[
                    productIndex]
                    .product_name;


        cout << "\n\n1. View Nutrition";

        cout << "\n2. Add to Basket";

        cout << "\n3. Compare with Products";

        cout << "\n4. Top Recommendations";

        cout << "\n5. Back";


        int choice;


        cout << "\n\nEnter choice: ";

        cin >> choice;


        if (choice == 1)
        {
            displayProduct(
                productIndex);
        }


        else if (choice == 2)
        {
            float quantity;


            cout << "\nEnter quantity in grams: ";

            cin >> quantity;


            if (quantity <= 0)
            {
                cout << "\nInvalid quantity."
                     << endl;

                continue;
            }


            basket.addProduct(
                productIndex,
                quantity);


            operationStack.push(
                productIndex,
                quantity,
                'A');
        }


        else if (choice == 3)
        {
            showRecommendations(
                productIndex,
                categoryProducts);
        }


        else if (choice == 4)
        {
            showRecommendations(
                productIndex,
                categoryProducts);
        }


        else if (choice == 5)
        {
            return;
        }


        else
        {
            cout << "\nInvalid choice."
                 << endl;
        }
    }
}


// =====================================================
// BROWSE PRODUCTS
// =====================================================

void browseProducts()
{
    vector<string> categories;


    categories.push_back(
        "Cereals & Breakfast");

    categories.push_back(
        "Rice, Grains & Flour");

    categories.push_back(
        "Bread & Bakery");

    categories.push_back(
        "Dairy");

    categories.push_back(
        "Fruits");

    categories.push_back(
        "Vegetables");

    categories.push_back(
        "Pulses & Legumes");

    categories.push_back(
        "Nuts & Seeds");

    categories.push_back(
        "Snacks");

    categories.push_back(
        "Beverages");


    while (true)
    {
        cout << "\n";

        cout << "\n========== PRODUCT CATEGORIES ==========";


        for (int i = 0;
             i < categories.size();
             i++)
        {
            cout << "\n"
                 << i + 1
                 << ". "
                 << categories[i];
        }


        cout << "\n11. Back";


        int categoryChoice;


        cout << "\n\nEnter choice: ";

        cin >> categoryChoice;


        if (categoryChoice == 11)
        {
            return;
        }


        if (categoryChoice < 1 ||
            categoryChoice > 10)
        {
            cout << "\nInvalid choice."
                 << endl;

            continue;
        }


        string selectedCategory =
            categories[
                categoryChoice - 1];


        vector<int> categoryProducts =
            getCategoryProducts(
                selectedCategory);


        if (categoryProducts.empty())
        {
            cout << "\nNo products found "
                 << "in this category."
                 << endl;

            continue;
        }


        while (true)
        {
            displayProductList(
                categoryProducts);


            cout << "\n0. Back";


            int productChoice;


            cout << "\n\nSelect product: ";

            cin >> productChoice;


            if (productChoice == 0)
            {
                break;
            }


            if (productChoice < 1 ||
                productChoice >
                    categoryProducts.size())
            {
                cout << "\nInvalid choice."
                     << endl;

                continue;
            }


            int productIndex =
                categoryProducts[
                    productChoice - 1];


            selectedProductMenu(
                productIndex,
                categoryProducts);
        }
    }
}


// =====================================================
// VIEW BASKET
// =====================================================

void viewBasket()
{
    basket.displayBasket(
        products);


    displayBasketNutrition(
        basket.getHead(),
        products);
}


// =====================================================
// UNDO OPERATION
// =====================================================

void undoOperation()
{
    if (operationStack.isEmpty())
    {
        cout << "\nNothing to undo.\n";
        return;
    }

    StackNode* operation =
        operationStack.peek();


    // ==============================
    // UNDO ADD
    // ==============================

    if (operation->operation == 'A')
    {
        float currentQuantity =
            basket.getQuantity(
                operation->productIndex
            );

        if (currentQuantity <=
            operation->quantity)
        {
            basket.removeProduct(
                operation->productIndex
            );
        }
        else
        {
            basket.changeQuantity(
                operation->productIndex,
                -operation->quantity
            );
        }

        cout <<
            "\nUndo: ADD operation reversed."
            << endl;
    }


    // ==============================
    // UNDO REMOVE
    // ==============================

    else if (operation->operation == 'R')
    {
        basket.addProduct(
            operation->productIndex,
            operation->quantity
        );

        cout <<
            "\nUndo: REMOVE operation reversed."
            << endl;
    }


    // ==============================
    // UNDO REPLACE
    // ==============================

    else if (operation->operation == 'W')
    {
        basket.replaceProduct(
            operation->newProductIndex,
            operation->productIndex
        );

        cout <<
            "\nUndo: REPLACE operation reversed."
            << endl;
    }


    operationStack.pop();
}


// =====================================================
// BUILD HASH TABLE
// =====================================================

void buildHashTable()
{
    productTable =
        new HashTable(
            products.size() * 2);


    for (int i = 0;
         i < products.size();
         i++)
    {
        productTable->insert(
            products[i].product_id,
            i);
    }


    cout << "\nProduct hash table created successfully."
         << endl;
}


// =====================================================
// SEARCH PRODUCT FROM TERMINAL
// =====================================================

void searchProduct()
{
    string productID;


    cout << "\n========== SEARCH PRODUCT ==========";


    cout << "\nEnter Product ID: ";

    cin >> productID;


    int index =
        productTable->search(
            productID);


    if (index == -1)
    {
        cout << "\nProduct not found."
             << endl;

        return;
    }


    cout << "\nProduct found successfully.";


    displayProduct(index);
}


// =====================================================
// VIEW HEALTH SCORE
// =====================================================

void viewHealthScore()
{
    NutritionTotal total =
        calculateBasketNutrition(
            basket.getHead(),
            products);

    HealthScoreBreakdown score =
        computeHealthScore(total, userGoal);

    displayHealthScore(score);
}


// =====================================================
// SET NUTRITION GOAL
// =====================================================

void setNutritionGoal()
{
    cout << "\n========== SET NUTRITION GOAL ==========\n";

    cout << "\nEnter target calories: ";
    cin >> userGoal.targetCalories;

    cout << "Enter target protein (g): ";
    cin >> userGoal.targetProtein;

    cout << "Enter max sugar (g): ";
    cin >> userGoal.maxSugar;

    cout << "Enter max sodium (mg): ";
    cin >> userGoal.maxSodium;

    cout << "\nGoal updated.\n";
}
void undoOperation();

// =====================================================
// WEB SERVER THREAD
// =====================================================

DWORD WINAPI startWebServer(
    LPVOID parameter)
{
    vector<Product>* productList =
        (vector<Product>*)parameter;


   WebServer server(
    *productList,
    *productTable,
    basket,
    operationStack,
    undoOperation
);


    server.start();


    return 0;
}


// =====================================================
// MAIN
// =====================================================

int main()
{
    // Load products
    loadProducts();


    if (products.empty())
    {
        cout << "\nNo products available."
             << endl;

        return 0;
    }


    // Build Hash Table
    buildHashTable();


    // Start C++ Web Server
    CreateThread(
        NULL,
        0,
        startWebServer,
        &products,
        0,
        NULL
    );


    // Terminal menu
    while (true)
    {
        cout << "\n";

        cout << "\n========================================";

        cout << "\n              NUTRITRACK";

        cout << "\n   Smart Grocery & Nutrition Assistant";

        cout << "\n========================================";


        cout << "\n1. Browse Products";

        cout << "\n2. Search Product";

        cout << "\n3. View Basket";

        cout << "\n4. Undo Last Operation";

        cout << "\n5. View Health Score";

        cout << "\n6. Set Nutrition Goal";

        cout << "\n7. Exit";


        int choice;


        cout << "\n\nEnter choice: ";

        cin >> choice;


        if (choice == 1)
        {
            browseProducts();
        }


        else if (choice == 2)
        {
            searchProduct();
        }


        else if (choice == 3)
        {
            viewBasket();
        }


        else if (choice == 4)
        {
            undoOperation();
        }


        else if (choice == 5)
        {
            viewHealthScore();
        }


        else if (choice == 6)
        {
            setNutritionGoal();
        }


        else if (choice == 7)
        {
            cout << "\nThank you for using NutriTrack!"
                 << endl;

            break;
        }


        else
        {
            cout << "\nInvalid choice."
                 << endl;
        }
    }


    delete productTable;


    return 0;
}
