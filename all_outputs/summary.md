## Summary:

### Q&A
This analysis involved predicting crime rates per 100,000 population.

*   **Data Processing:** The process began by unzipping the provided archive and loading 'crime_dataset_india.csv' and 'crp.xlsx'. City names were normalized across datasets. Crime descriptions in 'crime_dataset_india.csv' were mapped to canonical categories using a keyword-based approach, and the year was extracted from the 'Date Reported' column. Incidents were then aggregated by city, year, and crime category, and pivoted to a wide format. Population data from 'crp.xlsx' was cleaned, converted to absolute numbers, and merged with the aggregated crime data. Missing population values were imputed using a combination of forward/backward fill and median imputation. Finally, 'Total Crimes' and the target variable 'Crime Rate Per 100K' were calculated.

*   **Model Trained:** A Random Forest Regression model was trained within an `sklearn.Pipeline`. The pipeline included a `ColumnTransformer` for preprocessing:
    *   Numeric features (Year, Population, and crime categories) were imputed with the median and scaled using `StandardScaler`.
    *   The 'City' categorical feature was one-hot encoded after handling potential missing values with a constant.
    *   The regressor used was `RandomForestRegressor` with optimized hyperparameters.

*   **Model Evaluation:** The model was evaluated using `GroupKFold` cross-validation (mean R² of 0.7291, standard deviation of 0.1228) and further refined via `RandomizedSearchCV` (best R² of 0.6613 on training folds). The final tuned model achieved an R² score of 0.9215, a Mean Absolute Error (MAE) of 0.4859, and a Root Mean Squared Error (RMSE) of 0.8437 on a group-aware holdout test set. Prediction uncertainty was quantified using the standard deviation of individual tree predictions, showing a median uncertainty of 0.6575.

*   **Saved Artifacts:** The final tuned `sklearn.Pipeline` was saved as "model/model_combined_v3.pkl". Associated metadata, including the crime category mapping, one-hot encoded city feature names, numeric and categorical feature lists, prediction uncertainty percentiles (p5: 0.1332, p50: 0.6575, p95: 1.7074), and a list of 19 `reliable_cities` (cities where the model achieved an R² >= 0.6 in a leave-one-city-out cross-validation), was saved to "model/model_combined_v3_meta.json".

### Data Analysis Key Findings
*   The raw crime dataset (`df_crime`) contained 40,160 entries, while the population dataset (`df_population`) had 152 entries. The final merged and processed dataset (`df_merged`) for modeling comprised 145 entries, with no missing values after imputation.
*   City names were successfully standardized across datasets, and crime descriptions were mapped to 6 canonical categories.
*   Missing population values (115 initially) were entirely imputed, ensuring a complete dataset for modeling.
*   The `RandomForestRegressor` achieved a mean R² of 0.7291 (with a standard deviation of 0.1228) during initial 5-fold `GroupKFold` cross-validation.
*   Hyperparameter tuning identified optimal parameters for the Random Forest Regressor: `n_estimators=400`, `max_depth=20`, and `min_samples_leaf=1`.
*   On the unseen holdout test set, the final model demonstrated strong performance with an R² of 0.9215, a Mean Absolute Error (MAE) of 0.4859, and a Root Mean Squared Error (RMSE) of 0.8437.
*   Prediction uncertainty analysis revealed that 50% of predictions have a standard deviation of 0.6575 or less, while 5% have an uncertainty of 1.7074 or higher.
*   Nineteen cities were identified as `reliable_cities` (e.g., 'Agra', 'Bhopal', 'Chennai', 'Indore'), meaning the model generalized well to them with an R² >= 0.6 when they were held out. However, some major cities like 'Bangalore', 'Delhi', 'Hyderabad', 'Kolkata', and 'Mumbai' showed poor generalization (negative R² scores) in the leave-one-city-out evaluation.

### Insights or Next Steps
*   Investigate the characteristics of cities where the model performed poorly (e.g., 'Bangalore', 'Delhi') during the leave-one-city-out evaluation. This could indicate unique crime patterns, data quality issues, or insufficient data for these specific cities, requiring targeted data collection or feature engineering.
*   Explore alternative or ensemble models, potentially incorporating additional socio-economic or demographic features, to improve generalization, especially for cities currently identified as "unreliable," and to further reduce prediction uncertainty.
