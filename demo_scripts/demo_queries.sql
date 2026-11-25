-- Chạy bằng psql trên CSDL đã migrate; chỉ đọc, không thay đổi dữ liệu.
SET TIME ZONE 'UTC';
SELECT count(*) AS total_events, min(event_time) AS earliest_utc,
       max(event_time) AS latest_utc FROM earthquake_events;
SELECT event_time, magnitude, latitude, longitude, place
FROM earthquake_events ORDER BY event_time DESC LIMIT 10;
SELECT service_name, started_at, finished_at, status, records_processed, error_message
FROM service_runs ORDER BY started_at DESC LIMIT 20;
SELECT analysis_type, time_interval, period_start, period_end, calculated_at, metrics_data
FROM analysis_results ORDER BY calculated_at DESC LIMIT 10;
SELECT calculated_at, algorithm, parameters, total_clusters, noise_count, summary_clusters
FROM clustering_results ORDER BY calculated_at DESC LIMIT 1;
SELECT target_date, metric_name, predicted_value, lower_bound, upper_bound, generated_at
FROM prediction_results ORDER BY generated_at DESC LIMIT 10;
SELECT target_date, predicted_label, probability_scores, generated_at
FROM classification_results ORDER BY generated_at DESC LIMIT 10;
