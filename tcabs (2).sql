-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jan 31, 2026 at 11:30 AM
-- Server version: 8.0.44-0ubuntu0.24.04.1
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tcabs`
--

-- --------------------------------------------------------

--
-- Table structure for table `cancellation_policy`
--

CREATE TABLE `cancellation_policy` (
  `id` int NOT NULL,
  `hours` int NOT NULL,
  `percentage` int NOT NULL,
  `status` tinyint DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `category_complaints`
--

CREATE TABLE `category_complaints` (
  `id` bigint NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0=Inactive, 1=Active',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `category_complaints`
--

INSERT INTO `category_complaints` (`id`, `category`, `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(2, 'Safety Concern', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-12-06 09:38:56'),
(3, 'Overcharging / Fare Issue', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52'),
(4, 'Driver Took Wrong Route', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52'),
(5, 'Vehicle Condition Issue', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52'),
(6, 'Ride Cancellation Issue', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52'),
(7, 'Payment Related Issue', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52'),
(8, 'Lost Item', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52'),
(9, 'App Issue / Technical Error', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52'),
(10, 'Long Arrival Time', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52'),
(11, 'Rude Customer Support', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52'),
(12, 'Others', NULL, 1, NULL, NULL, '2025-11-22 05:22:52', '2025-11-22 05:22:52');

-- --------------------------------------------------------

--
-- Table structure for table `complaints`
--

CREATE TABLE `complaints` (
  `id` bigint NOT NULL,
  `ticket_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` bigint NOT NULL,
  `subcategory_id` bigint DEFAULT NULL,
  `custom_query` text COLLATE utf8mb4_unicode_ci COMMENT 'Custom query when Others category is selected',
  `user_id` bigint NOT NULL COMMENT 'User who filed the complaint',
  `user_type` enum('passenger','driver') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Type of user: passenger or driver',
  `ride_id` bigint NOT NULL COMMENT 'The ride this complaint is related to',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('open','resolved','escalate','closed','reopen') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `status_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Hex color code for status visibility',
  `owner_id` bigint DEFAULT NULL COMMENT 'Current owner of the complaint',
  `resolved_at` datetime DEFAULT NULL,
  `escalated_at` datetime DEFAULT NULL COMMENT 'Timestamp when complaint was escalated',
  `closed_at` datetime DEFAULT NULL COMMENT 'Timestamp when complaint was closed',
  `reopened_at` datetime DEFAULT NULL COMMENT 'Timestamp when complaint was reopened',
  `resolved_by` bigint DEFAULT NULL,
  `resolution_notes` text COLLATE utf8mb4_unicode_ci,
  `attachments` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of attachment file paths',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `complaint_assignments`
--

CREATE TABLE `complaint_assignments` (
  `id` bigint NOT NULL,
  `complaint_id` bigint NOT NULL,
  `assigned_to` bigint NOT NULL COMMENT 'Team member assigned to the complaint',
  `assigned_by` bigint NOT NULL COMMENT 'Admin who made the assignment',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the assignment was made',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Optional notes about the assignment',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Whether this assignment is currently active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks complaint assignments to team members';

-- --------------------------------------------------------

--
-- Table structure for table `driver_deposit_transactions`
--

CREATE TABLE `driver_deposit_transactions` (
  `id` bigint NOT NULL,
  `driver_id` bigint NOT NULL COMMENT 'Foreign key referencing users(id)',
  `transaction_id` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Unique transaction identifier',
  `transaction_type` enum('deposit_paid','cancellation_charge','refund','adjustment') COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Type of transaction',
  `ride_request_id` bigint DEFAULT NULL COMMENT 'Related ride request for cancellation charges',
  `amount` decimal(10,2) NOT NULL COMMENT 'Transaction amount (positive for deposits, negative for deductions)',
  `balance_before` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Deposit balance before transaction',
  `balance_after` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Deposit balance after transaction',
  `payment_method` enum('cash','easebuzz','bank_transfer','adjustment') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_gateway` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'easebuzz',
  `gateway_transaction_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gateway_payment_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gateway_order_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `description` varchar(500) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Description of the transaction',
  `cancellation_count` int DEFAULT NULL COMMENT 'Driver daily cancellation count when charge was applied',
  `cancellation_date` date DEFAULT NULL COMMENT 'Date of cancellation (for tracking daily limit)',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Additional transaction details in JSON',
  `processed_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `failure_reason` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `driver_deposit_transactions`
--

INSERT INTO `driver_deposit_transactions` (`id`, `driver_id`, `transaction_id`, `transaction_type`, `ride_request_id`, `amount`, `balance_before`, `balance_after`, `payment_method`, `payment_gateway`, `gateway_transaction_id`, `gateway_payment_id`, `gateway_order_id`, `status`, `description`, `cancellation_count`, `cancellation_date`, `metadata`, `processed_at`, `failed_at`, `failure_reason`, `created_at`, `updated_at`) VALUES
(1, 45, 'a9af6a3b_55b3_4142_8', 'deposit_paid', NULL, 1000.00, 1000.00, 2000.00, 'easebuzz', 'easebuzz', 'S251215074FJQZ', 'S251215074FJQZ', 'a9af6a3b_55b3_4142_8', 'completed', 'Driver Registration Deposit Amount', NULL, NULL, '\"{\\\"firstname\\\":\\\"Lamrin\\\",\\\"email\\\":\\\"lamrin67@gmail.com\\\",\\\"webhook_status\\\":\\\"success\\\",\\\"bank_ref_num\\\":\\\"041ba658e04d10bdd8419e136e99511e\\\",\\\"easepayid\\\":\\\"S251215074FJQZ\\\"}\"', '2025-12-15 18:20:44', NULL, NULL, '2025-12-15 18:20:44', '2025-12-15 18:20:44'),
(2, 54, 'SUB_c594910c_6c15_4e', 'deposit_paid', NULL, 999.00, 500.00, 1499.00, 'easebuzz', 'easebuzz', 'S260131074J4O9', 'S260131074J4O9', 'SUB_c594910c_6c15_4e', 'completed', 'Subscription Standard - 30 Days', NULL, NULL, '\"{\\\"firstname\\\":\\\"Nirmal\\\",\\\"email\\\":\\\"nirmalbalaji@techsaint.io\\\",\\\"webhook_status\\\":\\\"success\\\",\\\"bank_ref_num\\\":\\\"2d37e61922fd5fc990321956ee02ffb1\\\",\\\"easepayid\\\":\\\"S260131074J4O9\\\"}\"', '2026-01-31 00:44:35', NULL, NULL, '2026-01-31 00:44:35', '2026-01-31 00:44:35');

-- --------------------------------------------------------

--
-- Table structure for table `driver_details`
--

CREATE TABLE `driver_details` (
  `id` int NOT NULL,
  `user_id` bigint NOT NULL,
  `mobile_code` varchar(10) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '+91',
  `dob` date NOT NULL,
  `driver_type` enum('nefa_driver','registered_driver') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'registered_driver' COMMENT 'Type of driver: nefa_driver(Driver who nefa has) or registered_driver(common driver who resgistered) ',
  `vehicle_id` int NOT NULL,
  `vehicle_type_id` int NOT NULL,
  `aadhar_no` varchar(12) COLLATE utf8mb4_general_ci NOT NULL,
  `aadhar_front_image` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `aadhar_back_image` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `license_number` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `license_front_image` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `license_back_image` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `vehicle_rc_no` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `vehicle_rc_front_image` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `vehicle_rc_back_image` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `vehicle_images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `vehicle_number` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rating` varchar(12) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `deposit_status` enum('pending','paid','refunded') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `deposit_balance` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Current deposit balance after all transactions',
  `status` enum('pending','approved','rejected','suspended') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `reason` text COLLATE utf8mb4_general_ci COMMENT 'Reason for rejection when status is rejected',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `rules_accepted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether driver has accepted rules and regulations',
  `rules_accepted_at` datetime DEFAULT NULL COMMENT 'Timestamp when driver accepted rules and regulations',
  `deletion_request` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0: No request, 1: Deletion requested, 2: Deletion approved (to be processed)',
  `deletion_requested_at` datetime DEFAULT NULL COMMENT 'Timestamp when deletion was requested',
  `deletion_reason` text COLLATE utf8mb4_general_ci COMMENT 'Reason provided by driver for account deletion'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `driver_details`
--

INSERT INTO `driver_details` (`id`, `user_id`, `mobile_code`, `dob`, `driver_type`, `vehicle_id`, `vehicle_type_id`, `aadhar_no`, `aadhar_front_image`, `aadhar_back_image`, `license_number`, `license_front_image`, `license_back_image`, `vehicle_rc_no`, `vehicle_rc_front_image`, `vehicle_rc_back_image`, `vehicle_images`, `vehicle_number`, `rating`, `deposit_status`, `deposit_balance`, `status`, `reason`, `created_at`, `updated_at`, `rules_accepted`, `rules_accepted_at`, `deletion_request`, `deletion_requested_at`, `deletion_reason`) VALUES
(15, 42, '+91', '2001-12-14', 'registered_driver', 1, 2, '466497676895', 'aadhar_front_image-1765722067655-356982510-compressed1765722059100.jpg', 'aadhar_back_image-1765722067671-526373346-compressed1765722060566.jpg', 'TN8373838383I377', 'license_front_image-1765722067672-10025844-compressed1765722061826.jpg', 'license_back_image-1765722067681-750901612-compressed1765722063042.jpg', 'TN05CH5509', 'vehicle_rc_front_image-1765722067688-548103489-compressed1765722064254.jpg', 'vehicle_rc_back_image-1765722067690-347810994-compressed1765722065451.jpg', '\"[\\\"vehicle_images-1765722067695-113433497-compressed1765722066766.jpg\\\"]\"', NULL, NULL, 'paid', 500.00, 'approved', NULL, '2025-12-14 19:51:07', '2025-12-30 12:42:13', 1, '2025-12-14 19:51:32', 0, NULL, NULL),
(19, 46, '+91', '2002-12-29', 'registered_driver', 1, 2, '666968655655', 'aadhar_front_image-1767008251695-772690036-compressed1767008247298.jpg', 'aadhar_back_image-1767008251708-328145900-compressed1767008247910.jpg', 'HJCKGVHBJVJJVNVV', 'license_front_image-1767008251713-146804774-compressed1767008248442.jpg', 'license_back_image-1767008251725-648893337-compressed1767008248898.jpg', 'BJGMHBMHCHU', 'vehicle_rc_front_image-1767008251734-630355613-compressed1767008249465.jpg', 'vehicle_rc_back_image-1767008251735-480163394-compressed1767008250039.jpg', '\"[\\\"vehicle_images-1767008251738-459252002-compressed1767008250743.jpg\\\"]\"', NULL, NULL, 'paid', 500.00, 'approved', NULL, '2025-12-29 17:07:31', '2025-12-30 12:48:38', 1, '2025-12-30 12:48:38', 0, NULL, NULL),
(21, 50, '+91', '2000-01-17', 'registered_driver', 1, 2, '525869358569', 'aadhar_front_image-1768807891444-740432874-compressed1768807886408.jpg', 'aadhar_back_image-1768807891445-986907863-compressed1768807886854.jpg', 'TG678478HVC68577', 'license_front_image-1768807891446-473408010-compressed1768807887365.jpg', 'license_back_image-1768807891446-7952753-compressed1768807887902.jpg', 'HBFUJ67886H', 'vehicle_rc_front_image-1768807891448-960396237-compressed1768807888390.jpg', 'vehicle_rc_back_image-1768807891448-824568408-compressed1768807888813.jpg', '\"[\\\"vehicle_images-1768807891448-503712459-compressed1768807889409.jpg\\\"]\"', NULL, NULL, 'paid', 500.00, 'approved', NULL, '2026-01-19 13:01:31', '2026-01-31 16:58:28', 1, '2026-01-31 16:58:28', 0, NULL, NULL),
(23, 53, '+91', '2000-01-01', 'registered_driver', 1, 2, '865565965868', 'aadhar_front_image-1769252825443-508811587-compressed1769252820331.jpg', 'aadhar_back_image-1769252825443-806704869-compressed1769252821109.jpg', 'VHIHCNCBNGVJGGGH', 'license_front_image-1769252825444-43668900-compressed1769252821748.jpg', 'license_back_image-1769252825444-88413694-compressed1769252822310.jpg', 'VJFNVVBBCVB', 'vehicle_rc_front_image-1769252825445-528360558-compressed1769252822909.jpg', 'vehicle_rc_back_image-1769252825448-733803888-compressed1769252823471.jpg', '\"[\\\"vehicle_images-1769252825456-824772234-compressed1769252824382.jpg\\\"]\"', NULL, NULL, 'pending', 500.00, 'pending', NULL, '2026-01-24 16:37:05', '2026-01-24 16:37:05', 0, NULL, 0, NULL, NULL),
(24, 54, '+91', '2001-09-22', 'registered_driver', 1, 2, '959495959598', 'aadhar_front_image-1769793935023-911684457-compressed1769793925776.jpg', 'aadhar_back_image-1769793935025-312678765-compressed1769793927020.jpg', 'TN484858UF848384', 'license_front_image-1769793935027-514143733-compressed1769793928318.jpg', 'license_back_image-1769793935028-354485814-compressed1769793929598.jpg', 'TN05CJ5509', 'vehicle_rc_front_image-1769793935038-881906059-compressed1769793930816.jpg', 'vehicle_rc_back_image-1769793935039-611779232-compressed1769793932164.jpg', '\"[\\\"vehicle_images-1769793935041-747092386-compressed1769793933715.jpg\\\"]\"', NULL, NULL, 'paid', 1499.00, 'pending', NULL, '2026-01-30 22:55:35', '2026-01-31 00:44:35', 1, '2026-01-30 22:58:12', 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `driver_locations`
--

CREATE TABLE `driver_locations` (
  `id` bigint NOT NULL,
  `driver_id` bigint NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `is_online` tinyint(1) NOT NULL DEFAULT '0',
  `last_updated_at` datetime NOT NULL,
  `last_online_at` datetime DEFAULT NULL COMMENT 'Timestamp when driver last went online',
  `last_offline_at` datetime DEFAULT NULL COMMENT 'Timestamp when driver last went offline'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `driver_locations`
--

INSERT INTO `driver_locations` (`id`, `driver_id`, `latitude`, `longitude`, `is_online`, `last_updated_at`, `last_online_at`, `last_offline_at`) VALUES
(44, 42, NULL, NULL, 0, '2025-12-14 19:51:33', NULL, '2025-12-14 19:51:33'),
(45, 43, NULL, NULL, 0, '2025-12-14 21:50:44', NULL, '2025-12-14 21:50:44'),
(47, 45, 13.11257500, 80.24266330, 0, '2025-12-15 18:22:52', '2025-12-15 18:21:58', '2025-12-15 18:22:52'),
(51, 46, 12.91216930, 77.64720370, 1, '2026-01-24 17:42:22', '2026-01-24 17:42:22', '2026-01-24 17:42:21'),
(54, 50, 12.91203620, 77.64735850, 1, '2026-01-19 18:53:15', '2026-01-19 18:53:15', '2026-01-19 18:53:12'),
(62, 53, NULL, NULL, 0, '2026-01-24 17:02:45', NULL, '2026-01-24 17:02:45'),
(65, 54, NULL, NULL, 0, '2026-01-30 22:58:12', NULL, '2026-01-30 22:58:12');

-- --------------------------------------------------------

--
-- Table structure for table `driver_subscriptions`
--

CREATE TABLE `driver_subscriptions` (
  `id` bigint NOT NULL,
  `driver_id` bigint NOT NULL COMMENT 'Foreign key to users table',
  `plan_id` int NOT NULL COMMENT 'Foreign key to subscription_plans',
  `transaction_id` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Unique transaction identifier',
  `subscription_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Human-readable subscription number',
  `start_date` datetime NOT NULL COMMENT 'Subscription start date',
  `end_date` datetime DEFAULT NULL COMMENT 'Subscription end date (for duration_type=days)',
  `rides_remaining` int DEFAULT NULL COMMENT 'Remaining rides (for duration_type=rides)',
  `rides_used` int DEFAULT '0' COMMENT 'Number of rides used',
  `total_rides` int DEFAULT NULL COMMENT 'Total rides included (for duration_type=rides)',
  `amount_paid` decimal(10,2) NOT NULL COMMENT 'Amount paid for subscription',
  `payment_status` enum('pending','completed','failed','refunded') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `payment_method` enum('cash','easebuzz','wallet','bank_transfer') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_gateway` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'easebuzz',
  `gateway_transaction_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gateway_payment_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gateway_order_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('pending_activation','active','queued','expired','cancelled','suspended') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending_activation' COMMENT 'pending_activation: payment pending, queued: paid but waiting for previous to expire, active: currently active, expired: completed/expired, cancelled: payment failed/cancelled, suspended: manually suspended',
  `auto_renew` tinyint(1) DEFAULT '0' COMMENT 'Auto-renewal enabled',
  `cancelled_at` datetime DEFAULT NULL COMMENT 'Cancellation timestamp',
  `cancellation_reason` text COLLATE utf8mb4_general_ci,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Additional subscription details',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Driver subscription purchases';

--
-- Dumping data for table `driver_subscriptions`
--

INSERT INTO `driver_subscriptions` (`id`, `driver_id`, `plan_id`, `transaction_id`, `subscription_number`, `start_date`, `end_date`, `rides_remaining`, `rides_used`, `total_rides`, `amount_paid`, `payment_status`, `payment_method`, `payment_gateway`, `gateway_transaction_id`, `gateway_payment_id`, `gateway_order_id`, `status`, `auto_renew`, `cancelled_at`, `cancellation_reason`, `metadata`, `created_at`, `updated_at`) VALUES
(1, 54, 2, 'SUB_0c620042_b857_4f', 'SUBSC-1769800698774-54', '2026-01-31 00:48:18', '2026-03-02 00:48:18', NULL, 0, NULL, 999.00, 'completed', 'easebuzz', 'easebuzz', 'S260131074J4OC', 'S260131074J4OC', 'SUB_0c620042_b857_4f', 'active', 0, NULL, NULL, '\"{\\\"0\\\":\\\"{\\\",\\\"1\\\":\\\"\\\\\\\"\\\",\\\"2\\\":\\\"p\\\",\\\"3\\\":\\\"l\\\",\\\"4\\\":\\\"a\\\",\\\"5\\\":\\\"n\\\",\\\"6\\\":\\\"_\\\",\\\"7\\\":\\\"n\\\",\\\"8\\\":\\\"a\\\",\\\"9\\\":\\\"m\\\",\\\"10\\\":\\\"e\\\",\\\"11\\\":\\\"\\\\\\\"\\\",\\\"12\\\":\\\":\\\",\\\"13\\\":\\\"\\\\\\\"\\\",\\\"14\\\":\\\"S\\\",\\\"15\\\":\\\"t\\\",\\\"16\\\":\\\"a\\\",\\\"17\\\":\\\"n\\\",\\\"18\\\":\\\"d\\\",\\\"19\\\":\\\"a\\\",\\\"20\\\":\\\"r\\\",\\\"21\\\":\\\"d\\\",\\\"22\\\":\\\" \\\",\\\"23\\\":\\\"-\\\",\\\"24\\\":\\\" \\\",\\\"25\\\":\\\"3\\\",\\\"26\\\":\\\"0\\\",\\\"27\\\":\\\" \\\",\\\"28\\\":\\\"D\\\",\\\"29\\\":\\\"a\\\",\\\"30\\\":\\\"y\\\",\\\"31\\\":\\\"s\\\",\\\"32\\\":\\\"\\\\\\\"\\\",\\\"33\\\":\\\",\\\",\\\"34\\\":\\\"\\\\\\\"\\\",\\\"35\\\":\\\"p\\\",\\\"36\\\":\\\"l\\\",\\\"37\\\":\\\"a\\\",\\\"38\\\":\\\"n\\\",\\\"39\\\":\\\"_\\\",\\\"40\\\":\\\"d\\\",\\\"41\\\":\\\"e\\\",\\\"42\\\":\\\"s\\\",\\\"43\\\":\\\"c\\\",\\\"44\\\":\\\"r\\\",\\\"45\\\":\\\"i\\\",\\\"46\\\":\\\"p\\\",\\\"47\\\":\\\"t\\\",\\\"48\\\":\\\"i\\\",\\\"49\\\":\\\"o\\\",\\\"50\\\":\\\"n\\\",\\\"51\\\":\\\"\\\\\\\"\\\",\\\"52\\\":\\\":\\\",\\\"53\\\":\\\"\\\\\\\"\\\",\\\"54\\\":\\\"Z\\\",\\\"55\\\":\\\"e\\\",\\\"56\\\":\\\"r\\\",\\\"57\\\":\\\"o\\\",\\\"58\\\":\\\" \\\",\\\"59\\\":\\\"c\\\",\\\"60\\\":\\\"o\\\",\\\"61\\\":\\\"m\\\",\\\"62\\\":\\\"m\\\",\\\"63\\\":\\\"i\\\",\\\"64\\\":\\\"s\\\",\\\"65\\\":\\\"s\\\",\\\"66\\\":\\\"i\\\",\\\"67\\\":\\\"o\\\",\\\"68\\\":\\\"n\\\",\\\"69\\\":\\\" \\\",\\\"70\\\":\\\"f\\\",\\\"71\\\":\\\"o\\\",\\\"72\\\":\\\"r\\\",\\\"73\\\":\\\" \\\",\\\"74\\\":\\\"3\\\",\\\"75\\\":\\\"0\\\",\\\"76\\\":\\\" \\\",\\\"77\\\":\\\"d\\\",\\\"78\\\":\\\"a\\\",\\\"79\\\":\\\"y\\\",\\\"80\\\":\\\"s\\\",\\\"81\\\":\\\"\\\\\\\"\\\",\\\"82\\\":\\\",\\\",\\\"83\\\":\\\"\\\\\\\"\\\",\\\"84\\\":\\\"c\\\",\\\"85\\\":\\\"o\\\",\\\"86\\\":\\\"m\\\",\\\"87\\\":\\\"m\\\",\\\"88\\\":\\\"i\\\",\\\"89\\\":\\\"s\\\",\\\"90\\\":\\\"s\\\",\\\"91\\\":\\\"i\\\",\\\"92\\\":\\\"o\\\",\\\"93\\\":\\\"n\\\",\\\"94\\\":\\\"_\\\",\\\"95\\\":\\\"w\\\",\\\"96\\\":\\\"a\\\",\\\"97\\\":\\\"i\\\",\\\"98\\\":\\\"v\\\",\\\"99\\\":\\\"e\\\",\\\"100\\\":\\\"r\\\",\\\"101\\\":\\\"\\\\\\\"\\\",\\\"102\\\":\\\":\\\",\\\"103\\\":\\\"t\\\",\\\"104\\\":\\\"r\\\",\\\"105\\\":\\\"u\\\",\\\"106\\\":\\\"e\\\",\\\"107\\\":\\\",\\\",\\\"108\\\":\\\"\\\\\\\"\\\",\\\"109\\\":\\\"m\\\",\\\"110\\\":\\\"a\\\",\\\"111\\\":\\\"x\\\",\\\"112\\\":\\\"_\\\",\\\"113\\\":\\\"d\\\",\\\"114\\\":\\\"a\\\",\\\"115\\\":\\\"i\\\",\\\"116\\\":\\\"l\\\",\\\"117\\\":\\\"y\\\",\\\"118\\\":\\\"_\\\",\\\"119\\\":\\\"r\\\",\\\"120\\\":\\\"i\\\",\\\"121\\\":\\\"d\\\",\\\"122\\\":\\\"e\\\",\\\"123\\\":\\\"s\\\",\\\"124\\\":\\\"\\\\\\\"\\\",\\\"125\\\":\\\":\\\",\\\"126\\\":\\\"n\\\",\\\"127\\\":\\\"u\\\",\\\"128\\\":\\\"l\\\",\\\"129\\\":\\\"l\\\",\\\"130\\\":\\\",\\\",\\\"131\\\":\\\"\\\\\\\"\\\",\\\"132\\\":\\\"i\\\",\\\"133\\\":\\\"n\\\",\\\"134\\\":\\\"i\\\",\\\"135\\\":\\\"t\\\",\\\"136\\\":\\\"i\\\",\\\"137\\\":\\\"a\\\",\\\"138\\\":\\\"t\\\",\\\"139\\\":\\\"e\\\",\\\"140\\\":\\\"d\\\",\\\"141\\\":\\\"_\\\",\\\"142\\\":\\\"a\\\",\\\"143\\\":\\\"t\\\",\\\"144\\\":\\\"\\\\\\\"\\\",\\\"145\\\":\\\":\\\",\\\"146\\\":\\\"\\\\\\\"\\\",\\\"147\\\":\\\"2\\\",\\\"148\\\":\\\"0\\\",\\\"149\\\":\\\"2\\\",\\\"150\\\":\\\"6\\\",\\\"151\\\":\\\"-\\\",\\\"152\\\":\\\"0\\\",\\\"153\\\":\\\"1\\\",\\\"154\\\":\\\"-\\\",\\\"155\\\":\\\"3\\\",\\\"156\\\":\\\"0\\\",\\\"157\\\":\\\"T\\\",\\\"158\\\":\\\"1\\\",\\\"159\\\":\\\"9\\\",\\\"160\\\":\\\":\\\",\\\"161\\\":\\\"1\\\",\\\"162\\\":\\\"8\\\",\\\"163\\\":\\\":\\\",\\\"164\\\":\\\"1\\\",\\\"165\\\":\\\"8\\\",\\\"166\\\":\\\".\\\",\\\"167\\\":\\\"7\\\",\\\"168\\\":\\\"7\\\",\\\"169\\\":\\\"5\\\",\\\"170\\\":\\\"Z\\\",\\\"171\\\":\\\"\\\\\\\"\\\",\\\"172\\\":\\\",\\\",\\\"173\\\":\\\"\\\\\\\"\\\",\\\"174\\\":\\\"u\\\",\\\"175\\\":\\\"s\\\",\\\"176\\\":\\\"e\\\",\\\"177\\\":\\\"r\\\",\\\"178\\\":\\\"_\\\",\\\"179\\\":\\\"a\\\",\\\"180\\\":\\\"g\\\",\\\"181\\\":\\\"e\\\",\\\"182\\\":\\\"n\\\",\\\"183\\\":\\\"t\\\",\\\"184\\\":\\\"\\\\\\\"\\\",\\\"185\\\":\\\":\\\",\\\"186\\\":\\\"\\\\\\\"\\\",\\\"187\\\":\\\"D\\\",\\\"188\\\":\\\"a\\\",\\\"189\\\":\\\"r\\\",\\\"190\\\":\\\"t\\\",\\\"191\\\":\\\"/\\\",\\\"192\\\":\\\"3\\\",\\\"193\\\":\\\".\\\",\\\"194\\\":\\\"1\\\",\\\"195\\\":\\\"0\\\",\\\"196\\\":\\\" \\\",\\\"197\\\":\\\"(\\\",\\\"198\\\":\\\"d\\\",\\\"199\\\":\\\"a\\\",\\\"200\\\":\\\"r\\\",\\\"201\\\":\\\"t\\\",\\\"202\\\":\\\":\\\",\\\"203\\\":\\\"i\\\",\\\"204\\\":\\\"o\\\",\\\"205\\\":\\\")\\\",\\\"206\\\":\\\"\\\\\\\"\\\",\\\"207\\\":\\\"}\\\",\\\"payment_completed_at\\\":\\\"2026-01-30T19:18:32.637Z\\\",\\\"easepayid\\\":\\\"S260131074J4OC\\\",\\\"bank_ref_num\\\":\\\"a7c89e7aeb405ba50ca14740b7badad5\\\"}\"', '2026-01-31 00:48:18', '2026-01-31 00:48:32');
INSERT INTO `driver_subscriptions` (`id`, `driver_id`, `plan_id`, `transaction_id`, `subscription_number`, `start_date`, `end_date`, `rides_remaining`, `rides_used`, `total_rides`, `amount_paid`, `payment_status`, `payment_method`, `payment_gateway`, `gateway_transaction_id`, `gateway_payment_id`, `gateway_order_id`, `status`, `auto_renew`, `cancelled_at`, `cancellation_reason`, `metadata`, `created_at`, `updated_at`) VALUES
(2, 46, 2, 'SUB_8ee5fe30_e37d_4f', 'SUBSC-1769834725590-46', '2026-01-31 10:15:25', '2026-03-02 10:15:25', NULL, 0, NULL, 999.00, 'failed', 'easebuzz', 'easebuzz', NULL, NULL, 'SUB_8ee5fe30_e37d_4f', 'cancelled', 0, '2026-01-31 10:15:41', 'NA', '\"{\\\"0\\\":\\\"{\\\",\\\"1\\\":\\\"\\\\\\\"\\\",\\\"2\\\":\\\"0\\\",\\\"3\\\":\\\"\\\\\\\"\\\",\\\"4\\\":\\\":\\\",\\\"5\\\":\\\"\\\\\\\"\\\",\\\"6\\\":\\\"{\\\",\\\"7\\\":\\\"\\\\\\\"\\\",\\\"8\\\":\\\",\\\",\\\"9\\\":\\\"\\\\\\\"\\\",\\\"10\\\":\\\"1\\\",\\\"11\\\":\\\"\\\\\\\"\\\",\\\"12\\\":\\\":\\\",\\\"13\\\":\\\"\\\\\\\"\\\",\\\"14\\\":\\\"\\\\\\\\\\\",\\\"15\\\":\\\"\\\\\\\"\\\",\\\"16\\\":\\\"\\\\\\\"\\\",\\\"17\\\":\\\",\\\",\\\"18\\\":\\\"\\\\\\\"\\\",\\\"19\\\":\\\"2\\\",\\\"20\\\":\\\"\\\\\\\"\\\",\\\"21\\\":\\\":\\\",\\\"22\\\":\\\"\\\\\\\"\\\",\\\"23\\\":\\\"p\\\",\\\"24\\\":\\\"\\\\\\\"\\\",\\\"25\\\":\\\",\\\",\\\"26\\\":\\\"\\\\\\\"\\\",\\\"27\\\":\\\"3\\\",\\\"28\\\":\\\"\\\\\\\"\\\",\\\"29\\\":\\\":\\\",\\\"30\\\":\\\"\\\\\\\"\\\",\\\"31\\\":\\\"l\\\",\\\"32\\\":\\\"\\\\\\\"\\\",\\\"33\\\":\\\",\\\",\\\"34\\\":\\\"\\\\\\\"\\\",\\\"35\\\":\\\"4\\\",\\\"36\\\":\\\"\\\\\\\"\\\",\\\"37\\\":\\\":\\\",\\\"38\\\":\\\"\\\\\\\"\\\",\\\"39\\\":\\\"a\\\",\\\"40\\\":\\\"\\\\\\\"\\\",\\\"41\\\":\\\",\\\",\\\"42\\\":\\\"\\\\\\\"\\\",\\\"43\\\":\\\"5\\\",\\\"44\\\":\\\"\\\\\\\"\\\",\\\"45\\\":\\\":\\\",\\\"46\\\":\\\"\\\\\\\"\\\",\\\"47\\\":\\\"n\\\",\\\"48\\\":\\\"\\\\\\\"\\\",\\\"49\\\":\\\",\\\",\\\"50\\\":\\\"\\\\\\\"\\\",\\\"51\\\":\\\"6\\\",\\\"52\\\":\\\"\\\\\\\"\\\",\\\"53\\\":\\\":\\\",\\\"54\\\":\\\"\\\\\\\"\\\",\\\"55\\\":\\\"_\\\",\\\"56\\\":\\\"\\\\\\\"\\\",\\\"57\\\":\\\",\\\",\\\"58\\\":\\\"\\\\\\\"\\\",\\\"59\\\":\\\"7\\\",\\\"60\\\":\\\"\\\\\\\"\\\",\\\"61\\\":\\\":\\\",\\\"62\\\":\\\"\\\\\\\"\\\",\\\"63\\\":\\\"n\\\",\\\"64\\\":\\\"\\\\\\\"\\\",\\\"65\\\":\\\",\\\",\\\"66\\\":\\\"\\\\\\\"\\\",\\\"67\\\":\\\"8\\\",\\\"68\\\":\\\"\\\\\\\"\\\",\\\"69\\\":\\\":\\\",\\\"70\\\":\\\"\\\\\\\"\\\",\\\"71\\\":\\\"a\\\",\\\"72\\\":\\\"\\\\\\\"\\\",\\\"73\\\":\\\",\\\",\\\"74\\\":\\\"\\\\\\\"\\\",\\\"75\\\":\\\"9\\\",\\\"76\\\":\\\"\\\\\\\"\\\",\\\"77\\\":\\\":\\\",\\\"78\\\":\\\"\\\\\\\"\\\",\\\"79\\\":\\\"m\\\",\\\"80\\\":\\\"\\\\\\\"\\\",\\\"81\\\":\\\",\\\",\\\"82\\\":\\\"\\\\\\\"\\\",\\\"83\\\":\\\"1\\\",\\\"84\\\":\\\"0\\\",\\\"85\\\":\\\"\\\\\\\"\\\",\\\"86\\\":\\\":\\\",\\\"87\\\":\\\"\\\\\\\"\\\",\\\"88\\\":\\\"e\\\",\\\"89\\\":\\\"\\\\\\\"\\\",\\\"90\\\":\\\",\\\",\\\"91\\\":\\\"\\\\\\\"\\\",\\\"92\\\":\\\"1\\\",\\\"93\\\":\\\"1\\\",\\\"94\\\":\\\"\\\\\\\"\\\",\\\"95\\\":\\\":\\\",\\\"96\\\":\\\"\\\\\\\"\\\",\\\"97\\\":\\\"\\\\\\\\\\\",\\\"98\\\":\\\"\\\\\\\"\\\",\\\"99\\\":\\\"\\\\\\\"\\\",\\\"100\\\":\\\",\\\",\\\"101\\\":\\\"\\\\\\\"\\\",\\\"102\\\":\\\"1\\\",\\\"103\\\":\\\"2\\\",\\\"104\\\":\\\"\\\\\\\"\\\",\\\"105\\\":\\\":\\\",\\\"106\\\":\\\"\\\\\\\"\\\",\\\"107\\\":\\\":\\\",\\\"108\\\":\\\"\\\\\\\"\\\",\\\"109\\\":\\\",\\\",\\\"110\\\":\\\"\\\\\\\"\\\",\\\"111\\\":\\\"1\\\",\\\"112\\\":\\\"3\\\",\\\"113\\\":\\\"\\\\\\\"\\\",\\\"114\\\":\\\":\\\",\\\"115\\\":\\\"\\\\\\\"\\\",\\\"116\\\":\\\"\\\\\\\\\\\",\\\"117\\\":\\\"\\\\\\\"\\\",\\\"118\\\":\\\"\\\\\\\"\\\",\\\"119\\\":\\\",\\\",\\\"120\\\":\\\"\\\\\\\"\\\",\\\"121\\\":\\\"1\\\",\\\"122\\\":\\\"4\\\",\\\"123\\\":\\\"\\\\\\\"\\\",\\\"124\\\":\\\":\\\",\\\"125\\\":\\\"\\\\\\\"\\\",\\\"126\\\":\\\"S\\\",\\\"127\\\":\\\"\\\\\\\"\\\",\\\"128\\\":\\\",\\\",\\\"129\\\":\\\"\\\\\\\"\\\",\\\"130\\\":\\\"1\\\",\\\"131\\\":\\\"5\\\",\\\"132\\\":\\\"\\\\\\\"\\\",\\\"133\\\":\\\":\\\",\\\"134\\\":\\\"\\\\\\\"\\\",\\\"135\\\":\\\"t\\\",\\\"136\\\":\\\"\\\\\\\"\\\",\\\"137\\\":\\\",\\\",\\\"138\\\":\\\"\\\\\\\"\\\",\\\"139\\\":\\\"1\\\",\\\"140\\\":\\\"6\\\",\\\"141\\\":\\\"\\\\\\\"\\\",\\\"142\\\":\\\":\\\",\\\"143\\\":\\\"\\\\\\\"\\\",\\\"144\\\":\\\"a\\\",\\\"145\\\":\\\"\\\\\\\"\\\",\\\"146\\\":\\\",\\\",\\\"147\\\":\\\"\\\\\\\"\\\",\\\"148\\\":\\\"1\\\",\\\"149\\\":\\\"7\\\",\\\"150\\\":\\\"\\\\\\\"\\\",\\\"151\\\":\\\":\\\",\\\"152\\\":\\\"\\\\\\\"\\\",\\\"153\\\":\\\"n\\\",\\\"154\\\":\\\"\\\\\\\"\\\",\\\"155\\\":\\\",\\\",\\\"156\\\":\\\"\\\\\\\"\\\",\\\"157\\\":\\\"1\\\",\\\"158\\\":\\\"8\\\",\\\"159\\\":\\\"\\\\\\\"\\\",\\\"160\\\":\\\":\\\",\\\"161\\\":\\\"\\\\\\\"\\\",\\\"162\\\":\\\"d\\\",\\\"163\\\":\\\"\\\\\\\"\\\",\\\"164\\\":\\\",\\\",\\\"165\\\":\\\"\\\\\\\"\\\",\\\"166\\\":\\\"1\\\",\\\"167\\\":\\\"9\\\",\\\"168\\\":\\\"\\\\\\\"\\\",\\\"169\\\":\\\":\\\",\\\"170\\\":\\\"\\\\\\\"\\\",\\\"171\\\":\\\"a\\\",\\\"172\\\":\\\"\\\\\\\"\\\",\\\"173\\\":\\\",\\\",\\\"174\\\":\\\"\\\\\\\"\\\",\\\"175\\\":\\\"2\\\",\\\"176\\\":\\\"0\\\",\\\"177\\\":\\\"\\\\\\\"\\\",\\\"178\\\":\\\":\\\",\\\"179\\\":\\\"\\\\\\\"\\\",\\\"180\\\":\\\"r\\\",\\\"181\\\":\\\"\\\\\\\"\\\",\\\"182\\\":\\\",\\\",\\\"183\\\":\\\"\\\\\\\"\\\",\\\"184\\\":\\\"2\\\",\\\"185\\\":\\\"1\\\",\\\"186\\\":\\\"\\\\\\\"\\\",\\\"187\\\":\\\":\\\",\\\"188\\\":\\\"\\\\\\\"\\\",\\\"189\\\":\\\"d\\\",\\\"190\\\":\\\"\\\\\\\"\\\",\\\"191\\\":\\\",\\\",\\\"192\\\":\\\"\\\\\\\"\\\",\\\"193\\\":\\\"2\\\",\\\"194\\\":\\\"2\\\",\\\"195\\\":\\\"\\\\\\\"\\\",\\\"196\\\":\\\":\\\",\\\"197\\\":\\\"\\\\\\\"\\\",\\\"198\\\":\\\" \\\",\\\"199\\\":\\\"\\\\\\\"\\\",\\\"200\\\":\\\",\\\",\\\"201\\\":\\\"\\\\\\\"\\\",\\\"202\\\":\\\"2\\\",\\\"203\\\":\\\"3\\\",\\\"204\\\":\\\"\\\\\\\"\\\",\\\"205\\\":\\\":\\\",\\\"206\\\":\\\"\\\\\\\"\\\",\\\"207\\\":\\\"-\\\",\\\"208\\\":\\\"\\\\\\\"\\\",\\\"209\\\":\\\",\\\",\\\"210\\\":\\\"\\\\\\\"\\\",\\\"211\\\":\\\"2\\\",\\\"212\\\":\\\"4\\\",\\\"213\\\":\\\"\\\\\\\"\\\",\\\"214\\\":\\\":\\\",\\\"215\\\":\\\"\\\\\\\"\\\",\\\"216\\\":\\\" \\\",\\\"217\\\":\\\"\\\\\\\"\\\",\\\"218\\\":\\\",\\\",\\\"219\\\":\\\"\\\\\\\"\\\",\\\"220\\\":\\\"2\\\",\\\"221\\\":\\\"5\\\",\\\"222\\\":\\\"\\\\\\\"\\\",\\\"223\\\":\\\":\\\",\\\"224\\\":\\\"\\\\\\\"\\\",\\\"225\\\":\\\"3\\\",\\\"226\\\":\\\"\\\\\\\"\\\",\\\"227\\\":\\\",\\\",\\\"228\\\":\\\"\\\\\\\"\\\",\\\"229\\\":\\\"2\\\",\\\"230\\\":\\\"6\\\",\\\"231\\\":\\\"\\\\\\\"\\\",\\\"232\\\":\\\":\\\",\\\"233\\\":\\\"\\\\\\\"\\\",\\\"234\\\":\\\"0\\\",\\\"235\\\":\\\"\\\\\\\"\\\",\\\"236\\\":\\\",\\\",\\\"237\\\":\\\"\\\\\\\"\\\",\\\"238\\\":\\\"2\\\",\\\"239\\\":\\\"7\\\",\\\"240\\\":\\\"\\\\\\\"\\\",\\\"241\\\":\\\":\\\",\\\"242\\\":\\\"\\\\\\\"\\\",\\\"243\\\":\\\" \\\",\\\"244\\\":\\\"\\\\\\\"\\\",\\\"245\\\":\\\",\\\",\\\"246\\\":\\\"\\\\\\\"\\\",\\\"247\\\":\\\"2\\\",\\\"248\\\":\\\"8\\\",\\\"249\\\":\\\"\\\\\\\"\\\",\\\"250\\\":\\\":\\\",\\\"251\\\":\\\"\\\\\\\"\\\",\\\"252\\\":\\\"D\\\",\\\"253\\\":\\\"\\\\\\\"\\\",\\\"254\\\":\\\",\\\",\\\"255\\\":\\\"\\\\\\\"\\\",\\\"256\\\":\\\"2\\\",\\\"257\\\":\\\"9\\\",\\\"258\\\":\\\"\\\\\\\"\\\",\\\"259\\\":\\\":\\\",\\\"260\\\":\\\"\\\\\\\"\\\",\\\"261\\\":\\\"a\\\",\\\"262\\\":\\\"\\\\\\\"\\\",\\\"263\\\":\\\",\\\",\\\"264\\\":\\\"\\\\\\\"\\\",\\\"265\\\":\\\"3\\\",\\\"266\\\":\\\"0\\\",\\\"267\\\":\\\"\\\\\\\"\\\",\\\"268\\\":\\\":\\\",\\\"269\\\":\\\"\\\\\\\"\\\",\\\"270\\\":\\\"y\\\",\\\"271\\\":\\\"\\\\\\\"\\\",\\\"272\\\":\\\",\\\",\\\"273\\\":\\\"\\\\\\\"\\\",\\\"274\\\":\\\"3\\\",\\\"275\\\":\\\"1\\\",\\\"276\\\":\\\"\\\\\\\"\\\",\\\"277\\\":\\\":\\\",\\\"278\\\":\\\"\\\\\\\"\\\",\\\"279\\\":\\\"s\\\",\\\"280\\\":\\\"\\\\\\\"\\\",\\\"281\\\":\\\",\\\",\\\"282\\\":\\\"\\\\\\\"\\\",\\\"283\\\":\\\"3\\\",\\\"284\\\":\\\"2\\\",\\\"285\\\":\\\"\\\\\\\"\\\",\\\"286\\\":\\\":\\\",\\\"287\\\":\\\"\\\\\\\"\\\",\\\"288\\\":\\\"\\\\\\\\\\\",\\\"289\\\":\\\"\\\\\\\"\\\",\\\"290\\\":\\\"\\\\\\\"\\\",\\\"291\\\":\\\",\\\",\\\"292\\\":\\\"\\\\\\\"\\\",\\\"293\\\":\\\"3\\\",\\\"294\\\":\\\"3\\\",\\\"295\\\":\\\"\\\\\\\"\\\",\\\"296\\\":\\\":\\\",\\\"297\\\":\\\"\\\\\\\"\\\",\\\"298\\\":\\\",\\\",\\\"299\\\":\\\"\\\\\\\"\\\",\\\"300\\\":\\\",\\\",\\\"301\\\":\\\"\\\\\\\"\\\",\\\"302\\\":\\\"3\\\",\\\"303\\\":\\\"4\\\",\\\"304\\\":\\\"\\\\\\\"\\\",\\\"305\\\":\\\":\\\",\\\"306\\\":\\\"\\\\\\\"\\\",\\\"307\\\":\\\"\\\\\\\\\\\",\\\"308\\\":\\\"\\\\\\\"\\\",\\\"309\\\":\\\"\\\\\\\"\\\",\\\"310\\\":\\\",\\\",\\\"311\\\":\\\"\\\\\\\"\\\",\\\"312\\\":\\\"3\\\",\\\"313\\\":\\\"5\\\",\\\"314\\\":\\\"\\\\\\\"\\\",\\\"315\\\":\\\":\\\",\\\"316\\\":\\\"\\\\\\\"\\\",\\\"317\\\":\\\"p\\\",\\\"318\\\":\\\"\\\\\\\"\\\",\\\"319\\\":\\\",\\\",\\\"320\\\":\\\"\\\\\\\"\\\",\\\"321\\\":\\\"3\\\",\\\"322\\\":\\\"6\\\",\\\"323\\\":\\\"\\\\\\\"\\\",\\\"324\\\":\\\":\\\",\\\"325\\\":\\\"\\\\\\\"\\\",\\\"326\\\":\\\"l\\\",\\\"327\\\":\\\"\\\\\\\"\\\",\\\"328\\\":\\\",\\\",\\\"329\\\":\\\"\\\\\\\"\\\",\\\"330\\\":\\\"3\\\",\\\"331\\\":\\\"7\\\",\\\"332\\\":\\\"\\\\\\\"\\\",\\\"333\\\":\\\":\\\",\\\"334\\\":\\\"\\\\\\\"\\\",\\\"335\\\":\\\"a\\\",\\\"336\\\":\\\"\\\\\\\"\\\",\\\"337\\\":\\\",\\\",\\\"338\\\":\\\"\\\\\\\"\\\",\\\"339\\\":\\\"3\\\",\\\"340\\\":\\\"8\\\",\\\"341\\\":\\\"\\\\\\\"\\\",\\\"342\\\":\\\":\\\",\\\"343\\\":\\\"\\\\\\\"\\\",\\\"344\\\":\\\"n\\\",\\\"345\\\":\\\"\\\\\\\"\\\",\\\"346\\\":\\\",\\\",\\\"347\\\":\\\"\\\\\\\"\\\",\\\"348\\\":\\\"3\\\",\\\"349\\\":\\\"9\\\",\\\"350\\\":\\\"\\\\\\\"\\\",\\\"351\\\":\\\":\\\",\\\"352\\\":\\\"\\\\\\\"\\\",\\\"353\\\":\\\"_\\\",\\\"354\\\":\\\"\\\\\\\"\\\",\\\"355\\\":\\\",\\\",\\\"356\\\":\\\"\\\\\\\"\\\",\\\"357\\\":\\\"4\\\",\\\"358\\\":\\\"0\\\",\\\"359\\\":\\\"\\\\\\\"\\\",\\\"360\\\":\\\":\\\",\\\"361\\\":\\\"\\\\\\\"\\\",\\\"362\\\":\\\"d\\\",\\\"363\\\":\\\"\\\\\\\"\\\",\\\"364\\\":\\\",\\\",\\\"365\\\":\\\"\\\\\\\"\\\",\\\"366\\\":\\\"4\\\",\\\"367\\\":\\\"1\\\",\\\"368\\\":\\\"\\\\\\\"\\\",\\\"369\\\":\\\":\\\",\\\"370\\\":\\\"\\\\\\\"\\\",\\\"371\\\":\\\"e\\\",\\\"372\\\":\\\"\\\\\\\"\\\",\\\"373\\\":\\\",\\\",\\\"374\\\":\\\"\\\\\\\"\\\",\\\"375\\\":\\\"4\\\",\\\"376\\\":\\\"2\\\",\\\"377\\\":\\\"\\\\\\\"\\\",\\\"378\\\":\\\":\\\",\\\"379\\\":\\\"\\\\\\\"\\\",\\\"380\\\":\\\"s\\\",\\\"381\\\":\\\"\\\\\\\"\\\",\\\"382\\\":\\\",\\\",\\\"383\\\":\\\"\\\\\\\"\\\",\\\"384\\\":\\\"4\\\",\\\"385\\\":\\\"3\\\",\\\"386\\\":\\\"\\\\\\\"\\\",\\\"387\\\":\\\":\\\",\\\"388\\\":\\\"\\\\\\\"\\\",\\\"389\\\":\\\"c\\\",\\\"390\\\":\\\"\\\\\\\"\\\",\\\"391\\\":\\\",\\\",\\\"392\\\":\\\"\\\\\\\"\\\",\\\"393\\\":\\\"4\\\",\\\"394\\\":\\\"4\\\",\\\"395\\\":\\\"\\\\\\\"\\\",\\\"396\\\":\\\":\\\",\\\"397\\\":\\\"\\\\\\\"\\\",\\\"398\\\":\\\"r\\\",\\\"399\\\":\\\"\\\\\\\"\\\",\\\"400\\\":\\\",\\\",\\\"401\\\":\\\"\\\\\\\"\\\",\\\"402\\\":\\\"4\\\",\\\"403\\\":\\\"5\\\",\\\"404\\\":\\\"\\\\\\\"\\\",\\\"405\\\":\\\":\\\",\\\"406\\\":\\\"\\\\\\\"\\\",\\\"407\\\":\\\"i\\\",\\\"408\\\":\\\"\\\\\\\"\\\",\\\"409\\\":\\\",\\\",\\\"410\\\":\\\"\\\\\\\"\\\",\\\"411\\\":\\\"4\\\",\\\"412\\\":\\\"6\\\",\\\"413\\\":\\\"\\\\\\\"\\\",\\\"414\\\":\\\":\\\",\\\"415\\\":\\\"\\\\\\\"\\\",\\\"416\\\":\\\"p\\\",\\\"417\\\":\\\"\\\\\\\"\\\",\\\"418\\\":\\\",\\\",\\\"419\\\":\\\"\\\\\\\"\\\",\\\"420\\\":\\\"4\\\",\\\"421\\\":\\\"7\\\",\\\"422\\\":\\\"\\\\\\\"\\\",\\\"423\\\":\\\":\\\",\\\"424\\\":\\\"\\\\\\\"\\\",\\\"425\\\":\\\"t\\\",\\\"426\\\":\\\"\\\\\\\"\\\",\\\"427\\\":\\\",\\\",\\\"428\\\":\\\"\\\\\\\"\\\",\\\"429\\\":\\\"4\\\",\\\"430\\\":\\\"8\\\",\\\"431\\\":\\\"\\\\\\\"\\\",\\\"432\\\":\\\":\\\",\\\"433\\\":\\\"\\\\\\\"\\\",\\\"434\\\":\\\"i\\\",\\\"435\\\":\\\"\\\\\\\"\\\",\\\"436\\\":\\\",\\\",\\\"437\\\":\\\"\\\\\\\"\\\",\\\"438\\\":\\\"4\\\",\\\"439\\\":\\\"9\\\",\\\"440\\\":\\\"\\\\\\\"\\\",\\\"441\\\":\\\":\\\",\\\"442\\\":\\\"\\\\\\\"\\\",\\\"443\\\":\\\"o\\\",\\\"444\\\":\\\"\\\\\\\"\\\",\\\"445\\\":\\\",\\\",\\\"446\\\":\\\"\\\\\\\"\\\",\\\"447\\\":\\\"5\\\",\\\"448\\\":\\\"0\\\",\\\"449\\\":\\\"\\\\\\\"\\\",\\\"450\\\":\\\":\\\",\\\"451\\\":\\\"\\\\\\\"\\\",\\\"452\\\":\\\"n\\\",\\\"453\\\":\\\"\\\\\\\"\\\",\\\"454\\\":\\\",\\\",\\\"455\\\":\\\"\\\\\\\"\\\",\\\"456\\\":\\\"5\\\",\\\"457\\\":\\\"1\\\",\\\"458\\\":\\\"\\\\\\\"\\\",\\\"459\\\":\\\":\\\",\\\"460\\\":\\\"\\\\\\\"\\\",\\\"461\\\":\\\"\\\\\\\\\\\",\\\"462\\\":\\\"\\\\\\\"\\\",\\\"463\\\":\\\"\\\\\\\"\\\",\\\"464\\\":\\\",\\\",\\\"465\\\":\\\"\\\\\\\"\\\",\\\"466\\\":\\\"5\\\",\\\"467\\\":\\\"2\\\",\\\"468\\\":\\\"\\\\\\\"\\\",\\\"469\\\":\\\":\\\",\\\"470\\\":\\\"\\\\\\\"\\\",\\\"471\\\":\\\":\\\",\\\"472\\\":\\\"\\\\\\\"\\\",\\\"473\\\":\\\",\\\",\\\"474\\\":\\\"\\\\\\\"\\\",\\\"475\\\":\\\"5\\\",\\\"476\\\":\\\"3\\\",\\\"477\\\":\\\"\\\\\\\"\\\",\\\"478\\\":\\\":\\\",\\\"479\\\":\\\"\\\\\\\"\\\",\\\"480\\\":\\\"\\\\\\\\\\\",\\\"481\\\":\\\"\\\\\\\"\\\",\\\"482\\\":\\\"\\\\\\\"\\\",\\\"483\\\":\\\",\\\",\\\"484\\\":\\\"\\\\\\\"\\\",\\\"485\\\":\\\"5\\\",\\\"486\\\":\\\"4\\\",\\\"487\\\":\\\"\\\\\\\"\\\",\\\"488\\\":\\\":\\\",\\\"489\\\":\\\"\\\\\\\"\\\",\\\"490\\\":\\\"Z\\\",\\\"491\\\":\\\"\\\\\\\"\\\",\\\"492\\\":\\\",\\\",\\\"493\\\":\\\"\\\\\\\"\\\",\\\"494\\\":\\\"5\\\",\\\"495\\\":\\\"5\\\",\\\"496\\\":\\\"\\\\\\\"\\\",\\\"497\\\":\\\":\\\",\\\"498\\\":\\\"\\\\\\\"\\\",\\\"499\\\":\\\"e\\\",\\\"500\\\":\\\"\\\\\\\"\\\",\\\"501\\\":\\\",\\\",\\\"502\\\":\\\"\\\\\\\"\\\",\\\"503\\\":\\\"5\\\",\\\"504\\\":\\\"6\\\",\\\"505\\\":\\\"\\\\\\\"\\\",\\\"506\\\":\\\":\\\",\\\"507\\\":\\\"\\\\\\\"\\\",\\\"508\\\":\\\"r\\\",\\\"509\\\":\\\"\\\\\\\"\\\",\\\"510\\\":\\\",\\\",\\\"511\\\":\\\"\\\\\\\"\\\",\\\"512\\\":\\\"5\\\",\\\"513\\\":\\\"7\\\",\\\"514\\\":\\\"\\\\\\\"\\\",\\\"515\\\":\\\":\\\",\\\"516\\\":\\\"\\\\\\\"\\\",\\\"517\\\":\\\"o\\\",\\\"518\\\":\\\"\\\\\\\"\\\",\\\"519\\\":\\\",\\\",\\\"520\\\":\\\"\\\\\\\"\\\",\\\"521\\\":\\\"5\\\",\\\"522\\\":\\\"8\\\",\\\"523\\\":\\\"\\\\\\\"\\\",\\\"524\\\":\\\":\\\",\\\"525\\\":\\\"\\\\\\\"\\\",\\\"526\\\":\\\" \\\",\\\"527\\\":\\\"\\\\\\\"\\\",\\\"528\\\":\\\",\\\",\\\"529\\\":\\\"\\\\\\\"\\\",\\\"530\\\":\\\"5\\\",\\\"531\\\":\\\"9\\\",\\\"532\\\":\\\"\\\\\\\"\\\",\\\"533\\\":\\\":\\\",\\\"534\\\":\\\"\\\\\\\"\\\",\\\"535\\\":\\\"c\\\",\\\"536\\\":\\\"\\\\\\\"\\\",\\\"537\\\":\\\",\\\",\\\"538\\\":\\\"\\\\\\\"\\\",\\\"539\\\":\\\"6\\\",\\\"540\\\":\\\"0\\\",\\\"541\\\":\\\"\\\\\\\"\\\",\\\"542\\\":\\\":\\\",\\\"543\\\":\\\"\\\\\\\"\\\",\\\"544\\\":\\\"o\\\",\\\"545\\\":\\\"\\\\\\\"\\\",\\\"546\\\":\\\",\\\",\\\"547\\\":\\\"\\\\\\\"\\\",\\\"548\\\":\\\"6\\\",\\\"549\\\":\\\"1\\\",\\\"550\\\":\\\"\\\\\\\"\\\",\\\"551\\\":\\\":\\\",\\\"552\\\":\\\"\\\\\\\"\\\",\\\"553\\\":\\\"m\\\",\\\"554\\\":\\\"\\\\\\\"\\\",\\\"555\\\":\\\",\\\",\\\"556\\\":\\\"\\\\\\\"\\\",\\\"557\\\":\\\"6\\\",\\\"558\\\":\\\"2\\\",\\\"559\\\":\\\"\\\\\\\"\\\",\\\"560\\\":\\\":\\\",\\\"561\\\":\\\"\\\\\\\"\\\",\\\"562\\\":\\\"m\\\",\\\"563\\\":\\\"\\\\\\\"\\\",\\\"564\\\":\\\",\\\",\\\"565\\\":\\\"\\\\\\\"\\\",\\\"566\\\":\\\"6\\\",\\\"567\\\":\\\"3\\\",\\\"568\\\":\\\"\\\\\\\"\\\",\\\"569\\\":\\\":\\\",\\\"570\\\":\\\"\\\\\\\"\\\",\\\"571\\\":\\\"i\\\",\\\"572\\\":\\\"\\\\\\\"\\\",\\\"573\\\":\\\",\\\",\\\"574\\\":\\\"\\\\\\\"\\\",\\\"575\\\":\\\"6\\\",\\\"576\\\":\\\"4\\\",\\\"577\\\":\\\"\\\\\\\"\\\",\\\"578\\\":\\\":\\\",\\\"579\\\":\\\"\\\\\\\"\\\",\\\"580\\\":\\\"s\\\",\\\"581\\\":\\\"\\\\\\\"\\\",\\\"582\\\":\\\",\\\",\\\"583\\\":\\\"\\\\\\\"\\\",\\\"584\\\":\\\"6\\\",\\\"585\\\":\\\"5\\\",\\\"586\\\":\\\"\\\\\\\"\\\",\\\"587\\\":\\\":\\\",\\\"588\\\":\\\"\\\\\\\"\\\",\\\"589\\\":\\\"s\\\",\\\"590\\\":\\\"\\\\\\\"\\\",\\\"591\\\":\\\",\\\",\\\"592\\\":\\\"\\\\\\\"\\\",\\\"593\\\":\\\"6\\\",\\\"594\\\":\\\"6\\\",\\\"595\\\":\\\"\\\\\\\"\\\",\\\"596\\\":\\\":\\\",\\\"597\\\":\\\"\\\\\\\"\\\",\\\"598\\\":\\\"i\\\",\\\"599\\\":\\\"\\\\\\\"\\\",\\\"600\\\":\\\",\\\",\\\"601\\\":\\\"\\\\\\\"\\\",\\\"602\\\":\\\"6\\\",\\\"603\\\":\\\"7\\\",\\\"604\\\":\\\"\\\\\\\"\\\",\\\"605\\\":\\\":\\\",\\\"606\\\":\\\"\\\\\\\"\\\",\\\"607\\\":\\\"o\\\",\\\"608\\\":\\\"\\\\\\\"\\\",\\\"609\\\":\\\",\\\",\\\"610\\\":\\\"\\\\\\\"\\\",\\\"611\\\":\\\"6\\\",\\\"612\\\":\\\"8\\\",\\\"613\\\":\\\"\\\\\\\"\\\",\\\"614\\\":\\\":\\\",\\\"615\\\":\\\"\\\\\\\"\\\",\\\"616\\\":\\\"n\\\",\\\"617\\\":\\\"\\\\\\\"\\\",\\\"618\\\":\\\",\\\",\\\"619\\\":\\\"\\\\\\\"\\\",\\\"620\\\":\\\"6\\\",\\\"621\\\":\\\"9\\\",\\\"622\\\":\\\"\\\\\\\"\\\",\\\"623\\\":\\\":\\\",\\\"624\\\":\\\"\\\\\\\"\\\",\\\"625\\\":\\\" \\\",\\\"626\\\":\\\"\\\\\\\"\\\",\\\"627\\\":\\\",\\\",\\\"628\\\":\\\"\\\\\\\"\\\",\\\"629\\\":\\\"7\\\",\\\"630\\\":\\\"0\\\",\\\"631\\\":\\\"\\\\\\\"\\\",\\\"632\\\":\\\":\\\",\\\"633\\\":\\\"\\\\\\\"\\\",\\\"634\\\":\\\"f\\\",\\\"635\\\":\\\"\\\\\\\"\\\",\\\"636\\\":\\\",\\\",\\\"637\\\":\\\"\\\\\\\"\\\",\\\"638\\\":\\\"7\\\",\\\"639\\\":\\\"1\\\",\\\"640\\\":\\\"\\\\\\\"\\\",\\\"641\\\":\\\":\\\",\\\"642\\\":\\\"\\\\\\\"\\\",\\\"643\\\":\\\"o\\\",\\\"644\\\":\\\"\\\\\\\"\\\",\\\"645\\\":\\\",\\\",\\\"646\\\":\\\"\\\\\\\"\\\",\\\"647\\\":\\\"7\\\",\\\"648\\\":\\\"2\\\",\\\"649\\\":\\\"\\\\\\\"\\\",\\\"650\\\":\\\":\\\",\\\"651\\\":\\\"\\\\\\\"\\\",\\\"652\\\":\\\"r\\\",\\\"653\\\":\\\"\\\\\\\"\\\",\\\"654\\\":\\\",\\\",\\\"655\\\":\\\"\\\\\\\"\\\",\\\"656\\\":\\\"7\\\",\\\"657\\\":\\\"3\\\",\\\"658\\\":\\\"\\\\\\\"\\\",\\\"659\\\":\\\":\\\",\\\"660\\\":\\\"\\\\\\\"\\\",\\\"661\\\":\\\" \\\",\\\"662\\\":\\\"\\\\\\\"\\\",\\\"663\\\":\\\",\\\",\\\"664\\\":\\\"\\\\\\\"\\\",\\\"665\\\":\\\"7\\\",\\\"666\\\":\\\"4\\\",\\\"667\\\":\\\"\\\\\\\"\\\",\\\"668\\\":\\\":\\\",\\\"669\\\":\\\"\\\\\\\"\\\",\\\"670\\\":\\\"3\\\",\\\"671\\\":\\\"\\\\\\\"\\\",\\\"672\\\":\\\",\\\",\\\"673\\\":\\\"\\\\\\\"\\\",\\\"674\\\":\\\"7\\\",\\\"675\\\":\\\"5\\\",\\\"676\\\":\\\"\\\\\\\"\\\",\\\"677\\\":\\\":\\\",\\\"678\\\":\\\"\\\\\\\"\\\",\\\"679\\\":\\\"0\\\",\\\"680\\\":\\\"\\\\\\\"\\\",\\\"681\\\":\\\",\\\",\\\"682\\\":\\\"\\\\\\\"\\\",\\\"683\\\":\\\"7\\\",\\\"684\\\":\\\"6\\\",\\\"685\\\":\\\"\\\\\\\"\\\",\\\"686\\\":\\\":\\\",\\\"687\\\":\\\"\\\\\\\"\\\",\\\"688\\\":\\\" \\\",\\\"689\\\":\\\"\\\\\\\"\\\",\\\"690\\\":\\\",\\\",\\\"691\\\":\\\"\\\\\\\"\\\",\\\"692\\\":\\\"7\\\",\\\"693\\\":\\\"7\\\",\\\"694\\\":\\\"\\\\\\\"\\\",\\\"695\\\":\\\":\\\",\\\"696\\\":\\\"\\\\\\\"\\\",\\\"697\\\":\\\"d\\\",\\\"698\\\":\\\"\\\\\\\"\\\",\\\"699\\\":\\\",\\\",\\\"700\\\":\\\"\\\\\\\"\\\",\\\"701\\\":\\\"7\\\",\\\"702\\\":\\\"8\\\",\\\"703\\\":\\\"\\\\\\\"\\\",\\\"704\\\":\\\":\\\",\\\"705\\\":\\\"\\\\\\\"\\\",\\\"706\\\":\\\"a\\\",\\\"707\\\":\\\"\\\\\\\"\\\",\\\"708\\\":\\\",\\\",\\\"709\\\":\\\"\\\\\\\"\\\",\\\"710\\\":\\\"7\\\",\\\"711\\\":\\\"9\\\",\\\"712\\\":\\\"\\\\\\\"\\\",\\\"713\\\":\\\":\\\",\\\"714\\\":\\\"\\\\\\\"\\\",\\\"715\\\":\\\"y\\\",\\\"716\\\":\\\"\\\\\\\"\\\",\\\"717\\\":\\\",\\\",\\\"718\\\":\\\"\\\\\\\"\\\",\\\"719\\\":\\\"8\\\",\\\"720\\\":\\\"0\\\",\\\"721\\\":\\\"\\\\\\\"\\\",\\\"722\\\":\\\":\\\",\\\"723\\\":\\\"\\\\\\\"\\\",\\\"724\\\":\\\"s\\\",\\\"725\\\":\\\"\\\\\\\"\\\",\\\"726\\\":\\\",\\\",\\\"727\\\":\\\"\\\\\\\"\\\",\\\"728\\\":\\\"8\\\",\\\"729\\\":\\\"1\\\",\\\"730\\\":\\\"\\\\\\\"\\\",\\\"731\\\":\\\":\\\",\\\"732\\\":\\\"\\\\\\\"\\\",\\\"733\\\":\\\"\\\\\\\\\\\",\\\"734\\\":\\\"\\\\\\\"\\\",\\\"735\\\":\\\"\\\\\\\"\\\",\\\"736\\\":\\\",\\\",\\\"737\\\":\\\"\\\\\\\"\\\",\\\"738\\\":\\\"8\\\",\\\"739\\\":\\\"2\\\",\\\"740\\\":\\\"\\\\\\\"\\\",\\\"741\\\":\\\":\\\",\\\"742\\\":\\\"\\\\\\\"\\\",\\\"743\\\":\\\",\\\",\\\"744\\\":\\\"\\\\\\\"\\\",\\\"745\\\":\\\",\\\",\\\"746\\\":\\\"\\\\\\\"\\\",\\\"747\\\":\\\"8\\\",\\\"748\\\":\\\"3\\\",\\\"749\\\":\\\"\\\\\\\"\\\",\\\"750\\\":\\\":\\\",\\\"751\\\":\\\"\\\\\\\"\\\",\\\"752\\\":\\\"\\\\\\\\\\\",\\\"753\\\":\\\"\\\\\\\"\\\",\\\"754\\\":\\\"\\\\\\\"\\\",\\\"755\\\":\\\",\\\",\\\"756\\\":\\\"\\\\\\\"\\\",\\\"757\\\":\\\"8\\\",\\\"758\\\":\\\"4\\\",\\\"759\\\":\\\"\\\\\\\"\\\",\\\"760\\\":\\\":\\\",\\\"761\\\":\\\"\\\\\\\"\\\",\\\"762\\\":\\\"c\\\",\\\"763\\\":\\\"\\\\\\\"\\\",\\\"764\\\":\\\",\\\",\\\"765\\\":\\\"\\\\\\\"\\\",\\\"766\\\":\\\"8\\\",\\\"767\\\":\\\"5\\\",\\\"768\\\":\\\"\\\\\\\"\\\",\\\"769\\\":\\\":\\\",\\\"770\\\":\\\"\\\\\\\"\\\",\\\"771\\\":\\\"o\\\",\\\"772\\\":\\\"\\\\\\\"\\\",\\\"773\\\":\\\",\\\",\\\"774\\\":\\\"\\\\\\\"\\\",\\\"775\\\":\\\"8\\\",\\\"776\\\":\\\"6\\\",\\\"777\\\":\\\"\\\\\\\"\\\",\\\"778\\\":\\\":\\\",\\\"779\\\":\\\"\\\\\\\"\\\",\\\"780\\\":\\\"m\\\",\\\"781\\\":\\\"\\\\\\\"\\\",\\\"782\\\":\\\",\\\",\\\"783\\\":\\\"\\\\\\\"\\\",\\\"784\\\":\\\"8\\\",\\\"785\\\":\\\"7\\\",\\\"786\\\":\\\"\\\\\\\"\\\",\\\"787\\\":\\\":\\\",\\\"788\\\":\\\"\\\\\\\"\\\",\\\"789\\\":\\\"m\\\",\\\"790\\\":\\\"\\\\\\\"\\\",\\\"791\\\":\\\",\\\",\\\"792\\\":\\\"\\\\\\\"\\\",\\\"793\\\":\\\"8\\\",\\\"794\\\":\\\"8\\\",\\\"795\\\":\\\"\\\\\\\"\\\",\\\"796\\\":\\\":\\\",\\\"797\\\":\\\"\\\\\\\"\\\",\\\"798\\\":\\\"i\\\",\\\"799\\\":\\\"\\\\\\\"\\\",\\\"800\\\":\\\",\\\",\\\"801\\\":\\\"\\\\\\\"\\\",\\\"802\\\":\\\"8\\\",\\\"803\\\":\\\"9\\\",\\\"804\\\":\\\"\\\\\\\"\\\",\\\"805\\\":\\\":\\\",\\\"806\\\":\\\"\\\\\\\"\\\",\\\"807\\\":\\\"s\\\",\\\"808\\\":\\\"\\\\\\\"\\\",\\\"809\\\":\\\",\\\",\\\"810\\\":\\\"\\\\\\\"\\\",\\\"811\\\":\\\"9\\\",\\\"812\\\":\\\"0\\\",\\\"813\\\":\\\"\\\\\\\"\\\",\\\"814\\\":\\\":\\\",\\\"815\\\":\\\"\\\\\\\"\\\",\\\"816\\\":\\\"s\\\",\\\"817\\\":\\\"\\\\\\\"\\\",\\\"818\\\":\\\",\\\",\\\"819\\\":\\\"\\\\\\\"\\\",\\\"820\\\":\\\"9\\\",\\\"821\\\":\\\"1\\\",\\\"822\\\":\\\"\\\\\\\"\\\",\\\"823\\\":\\\":\\\",\\\"824\\\":\\\"\\\\\\\"\\\",\\\"825\\\":\\\"i\\\",\\\"826\\\":\\\"\\\\\\\"\\\",\\\"827\\\":\\\",\\\",\\\"828\\\":\\\"\\\\\\\"\\\",\\\"829\\\":\\\"9\\\",\\\"830\\\":\\\"2\\\",\\\"831\\\":\\\"\\\\\\\"\\\",\\\"832\\\":\\\":\\\",\\\"833\\\":\\\"\\\\\\\"\\\",\\\"834\\\":\\\"o\\\",\\\"835\\\":\\\"\\\\\\\"\\\",\\\"836\\\":\\\",\\\",\\\"837\\\":\\\"\\\\\\\"\\\",\\\"838\\\":\\\"9\\\",\\\"839\\\":\\\"3\\\",\\\"840\\\":\\\"\\\\\\\"\\\",\\\"841\\\":\\\":\\\",\\\"842\\\":\\\"\\\\\\\"\\\",\\\"843\\\":\\\"n\\\",\\\"844\\\":\\\"\\\\\\\"\\\",\\\"845\\\":\\\",\\\",\\\"846\\\":\\\"\\\\\\\"\\\",\\\"847\\\":\\\"9\\\",\\\"848\\\":\\\"4\\\",\\\"849\\\":\\\"\\\\\\\"\\\",\\\"850\\\":\\\":\\\",\\\"851\\\":\\\"\\\\\\\"\\\",\\\"852\\\":\\\"_\\\",\\\"853\\\":\\\"\\\\\\\"\\\",\\\"854\\\":\\\",\\\",\\\"855\\\":\\\"\\\\\\\"\\\",\\\"856\\\":\\\"9\\\",\\\"857\\\":\\\"5\\\",\\\"858\\\":\\\"\\\\\\\"\\\",\\\"859\\\":\\\":\\\",\\\"860\\\":\\\"\\\\\\\"\\\",\\\"861\\\":\\\"w\\\",\\\"862\\\":\\\"\\\\\\\"\\\",\\\"863\\\":\\\",\\\",\\\"864\\\":\\\"\\\\\\\"\\\",\\\"865\\\":\\\"9\\\",\\\"866\\\":\\\"6\\\",\\\"867\\\":\\\"\\\\\\\"\\\",\\\"868\\\":\\\":\\\",\\\"869\\\":\\\"\\\\\\\"\\\",\\\"870\\\":\\\"a\\\",\\\"871\\\":\\\"\\\\\\\"\\\",\\\"872\\\":\\\",\\\",\\\"873\\\":\\\"\\\\\\\"\\\",\\\"874\\\":\\\"9\\\",\\\"875\\\":\\\"7\\\",\\\"876\\\":\\\"\\\\\\\"\\\",\\\"877\\\":\\\":\\\",\\\"878\\\":\\\"\\\\\\\"\\\",\\\"879\\\":\\\"i\\\",\\\"880\\\":\\\"\\\\\\\"\\\",\\\"881\\\":\\\",\\\",\\\"882\\\":\\\"\\\\\\\"\\\",\\\"883\\\":\\\"9\\\",\\\"884\\\":\\\"8\\\",\\\"885\\\":\\\"\\\\\\\"\\\",\\\"886\\\":\\\":\\\",\\\"887\\\":\\\"\\\\\\\"\\\",\\\"888\\\":\\\"v\\\",\\\"889\\\":\\\"\\\\\\\"\\\",\\\"890\\\":\\\",\\\",\\\"891\\\":\\\"\\\\\\\"\\\",\\\"892\\\":\\\"9\\\",\\\"893\\\":\\\"9\\\",\\\"894\\\":\\\"\\\\\\\"\\\",\\\"895\\\":\\\":\\\",\\\"896\\\":\\\"\\\\\\\"\\\",\\\"897\\\":\\\"e\\\",\\\"898\\\":\\\"\\\\\\\"\\\",\\\"899\\\":\\\",\\\",\\\"900\\\":\\\"\\\\\\\"\\\",\\\"901\\\":\\\"1\\\",\\\"902\\\":\\\"0\\\",\\\"903\\\":\\\"0\\\",\\\"904\\\":\\\"\\\\\\\"\\\",\\\"905\\\":\\\":\\\",\\\"906\\\":\\\"\\\\\\\"\\\",\\\"907\\\":\\\"r\\\",\\\"908\\\":\\\"\\\\\\\"\\\",\\\"909\\\":\\\",\\\",\\\"910\\\":\\\"\\\\\\\"\\\",\\\"911\\\":\\\"1\\\",\\\"912\\\":\\\"0\\\",\\\"913\\\":\\\"1\\\",\\\"914\\\":\\\"\\\\\\\"\\\",\\\"915\\\":\\\":\\\",\\\"916\\\":\\\"\\\\\\\"\\\",\\\"917\\\":\\\"\\\\\\\\\\\",\\\"918\\\":\\\"\\\\\\\"\\\",\\\"919\\\":\\\"\\\\\\\"\\\",\\\"920\\\":\\\",\\\",\\\"921\\\":\\\"\\\\\\\"\\\",\\\"922\\\":\\\"1\\\",\\\"923\\\":\\\"0\\\",\\\"924\\\":\\\"2\\\",\\\"925\\\":\\\"\\\\\\\"\\\",\\\"926\\\":\\\":\\\",\\\"927\\\":\\\"\\\\\\\"\\\",\\\"928\\\":\\\":\\\",\\\"929\\\":\\\"\\\\\\\"\\\",\\\"930\\\":\\\",\\\",\\\"931\\\":\\\"\\\\\\\"\\\",\\\"932\\\":\\\"1\\\",\\\"933\\\":\\\"0\\\",\\\"934\\\":\\\"3\\\",\\\"935\\\":\\\"\\\\\\\"\\\",\\\"936\\\":\\\":\\\",\\\"937\\\":\\\"\\\\\\\"\\\",\\\"938\\\":\\\"t\\\",\\\"939\\\":\\\"\\\\\\\"\\\",\\\"940\\\":\\\",\\\",\\\"941\\\":\\\"\\\\\\\"\\\",\\\"942\\\":\\\"1\\\",\\\"943\\\":\\\"0\\\",\\\"944\\\":\\\"4\\\",\\\"945\\\":\\\"\\\\\\\"\\\",\\\"946\\\":\\\":\\\",\\\"947\\\":\\\"\\\\\\\"\\\",\\\"948\\\":\\\"r\\\",\\\"949\\\":\\\"\\\\\\\"\\\",\\\"950\\\":\\\",\\\",\\\"951\\\":\\\"\\\\\\\"\\\",\\\"952\\\":\\\"1\\\",\\\"953\\\":\\\"0\\\",\\\"954\\\":\\\"5\\\",\\\"955\\\":\\\"\\\\\\\"\\\",\\\"956\\\":\\\":\\\",\\\"957\\\":\\\"\\\\\\\"\\\",\\\"958\\\":\\\"u\\\",\\\"959\\\":\\\"\\\\\\\"\\\",\\\"960\\\":\\\",\\\",\\\"961\\\":\\\"\\\\\\\"\\\",\\\"962\\\":\\\"1\\\",\\\"963\\\":\\\"0\\\",\\\"964\\\":\\\"6\\\",\\\"965\\\":\\\"\\\\\\\"\\\",\\\"966\\\":\\\":\\\",\\\"967\\\":\\\"\\\\\\\"\\\",\\\"968\\\":\\\"e\\\",\\\"969\\\":\\\"\\\\\\\"\\\",\\\"970\\\":\\\",\\\",\\\"971\\\":\\\"\\\\\\\"\\\",\\\"972\\\":\\\"1\\\",\\\"973\\\":\\\"0\\\",\\\"974\\\":\\\"7\\\",\\\"975\\\":\\\"\\\\\\\"\\\",\\\"976\\\":\\\":\\\",\\\"977\\\":\\\"\\\\\\\"\\\",\\\"978\\\":\\\",\\\",\\\"979\\\":\\\"\\\\\\\"\\\",\\\"980\\\":\\\",\\\",\\\"981\\\":\\\"\\\\\\\"\\\",\\\"982\\\":\\\"1\\\",\\\"983\\\":\\\"0\\\",\\\"984\\\":\\\"8\\\",\\\"985\\\":\\\"\\\\\\\"\\\",\\\"986\\\":\\\":\\\",\\\"987\\\":\\\"\\\\\\\"\\\",\\\"988\\\":\\\"\\\\\\\\\\\",\\\"989\\\":\\\"\\\\\\\"\\\",\\\"990\\\":\\\"\\\\\\\"\\\",\\\"991\\\":\\\",\\\",\\\"992\\\":\\\"\\\\\\\"\\\",\\\"993\\\":\\\"1\\\",\\\"994\\\":\\\"0\\\",\\\"995\\\":\\\"9\\\",\\\"996\\\":\\\"\\\\\\\"\\\",\\\"997\\\":\\\":\\\",\\\"998\\\":\\\"\\\\\\\"\\\",\\\"999\\\":\\\"m\\\",\\\"1000\\\":\\\"\\\\\\\"\\\",\\\"1001\\\":\\\",\\\",\\\"1002\\\":\\\"\\\\\\\"\\\",\\\"1003\\\":\\\"1\\\",\\\"1004\\\":\\\"1\\\",\\\"1005\\\":\\\"0\\\",\\\"1006\\\":\\\"\\\\\\\"\\\",\\\"1007\\\":\\\":\\\",\\\"1008\\\":\\\"\\\\\\\"\\\",\\\"1009\\\":\\\"a\\\",\\\"1010\\\":\\\"\\\\\\\"\\\",\\\"1011\\\":\\\",\\\",\\\"1012\\\":\\\"\\\\\\\"\\\",\\\"1013\\\":\\\"1\\\",\\\"1014\\\":\\\"1\\\",\\\"1015\\\":\\\"1\\\",\\\"1016\\\":\\\"\\\\\\\"\\\",\\\"1017\\\":\\\":\\\",\\\"1018\\\":\\\"\\\\\\\"\\\",\\\"1019\\\":\\\"x\\\",\\\"1020\\\":\\\"\\\\\\\"\\\",\\\"1021\\\":\\\",\\\",\\\"1022\\\":\\\"\\\\\\\"\\\",\\\"1023\\\":\\\"1\\\",\\\"1024\\\":\\\"1\\\",\\\"1025\\\":\\\"2\\\",\\\"1026\\\":\\\"\\\\\\\"\\\",\\\"1027\\\":\\\":\\\",\\\"1028\\\":\\\"\\\\\\\"\\\",\\\"1029\\\":\\\"_\\\",\\\"1030\\\":\\\"\\\\\\\"\\\",\\\"1031\\\":\\\",\\\",\\\"1032\\\":\\\"\\\\\\\"\\\",\\\"1033\\\":\\\"1\\\",\\\"1034\\\":\\\"1\\\",\\\"1035\\\":\\\"3\\\",\\\"1036\\\":\\\"\\\\\\\"\\\",\\\"1037\\\":\\\":\\\",\\\"1038\\\":\\\"\\\\\\\"\\\",\\\"1039\\\":\\\"d\\\",\\\"1040\\\":\\\"\\\\\\\"\\\",\\\"1041\\\":\\\",\\\",\\\"1042\\\":\\\"\\\\\\\"\\\",\\\"1043\\\":\\\"1\\\",\\\"1044\\\":\\\"1\\\",\\\"1045\\\":\\\"4\\\",\\\"1046\\\":\\\"\\\\\\\"\\\",\\\"1047\\\":\\\":\\\",\\\"1048\\\":\\\"\\\\\\\"\\\",\\\"1049\\\":\\\"a\\\",\\\"1050\\\":\\\"\\\\\\\"\\\",\\\"1051\\\":\\\",\\\",\\\"1052\\\":\\\"\\\\\\\"\\\",\\\"1053\\\":\\\"1\\\",\\\"1054\\\":\\\"1\\\",\\\"1055\\\":\\\"5\\\",\\\"1056\\\":\\\"\\\\\\\"\\\",\\\"1057\\\":\\\":\\\",\\\"1058\\\":\\\"\\\\\\\"\\\",\\\"1059\\\":\\\"i\\\",\\\"1060\\\":\\\"\\\\\\\"\\\",\\\"1061\\\":\\\",\\\",\\\"1062\\\":\\\"\\\\\\\"\\\",\\\"1063\\\":\\\"1\\\",\\\"1064\\\":\\\"1\\\",\\\"1065\\\":\\\"6\\\",\\\"1066\\\":\\\"\\\\\\\"\\\",\\\"1067\\\":\\\":\\\",\\\"1068\\\":\\\"\\\\\\\"\\\",\\\"1069\\\":\\\"l\\\",\\\"1070\\\":\\\"\\\\\\\"\\\",\\\"1071\\\":\\\",\\\",\\\"1072\\\":\\\"\\\\\\\"\\\",\\\"1073\\\":\\\"1\\\",\\\"1074\\\":\\\"1\\\",\\\"1075\\\":\\\"7\\\",\\\"1076\\\":\\\"\\\\\\\"\\\",\\\"1077\\\":\\\":\\\",\\\"1078\\\":\\\"\\\\\\\"\\\",\\\"1079\\\":\\\"y\\\",\\\"1080\\\":\\\"\\\\\\\"\\\",\\\"1081\\\":\\\",\\\",\\\"1082\\\":\\\"\\\\\\\"\\\",\\\"1083\\\":\\\"1\\\",\\\"1084\\\":\\\"1\\\",\\\"1085\\\":\\\"8\\\",\\\"1086\\\":\\\"\\\\\\\"\\\",\\\"1087\\\":\\\":\\\",\\\"1088\\\":\\\"\\\\\\\"\\\",\\\"1089\\\":\\\"_\\\",\\\"1090\\\":\\\"\\\\\\\"\\\",\\\"1091\\\":\\\",\\\",\\\"1092\\\":\\\"\\\\\\\"\\\",\\\"1093\\\":\\\"1\\\",\\\"1094\\\":\\\"1\\\",\\\"1095\\\":\\\"9\\\",\\\"1096\\\":\\\"\\\\\\\"\\\",\\\"1097\\\":\\\":\\\",\\\"1098\\\":\\\"\\\\\\\"\\\",\\\"1099\\\":\\\"r\\\",\\\"1100\\\":\\\"\\\\\\\"\\\",\\\"1101\\\":\\\",\\\",\\\"1102\\\":\\\"\\\\\\\"\\\",\\\"1103\\\":\\\"1\\\",\\\"1104\\\":\\\"2\\\",\\\"1105\\\":\\\"0\\\",\\\"1106\\\":\\\"\\\\\\\"\\\",\\\"1107\\\":\\\":\\\",\\\"1108\\\":\\\"\\\\\\\"\\\",\\\"1109\\\":\\\"i\\\",\\\"1110\\\":\\\"\\\\\\\"\\\",\\\"1111\\\":\\\",\\\",\\\"1112\\\":\\\"\\\\\\\"\\\",\\\"1113\\\":\\\"1\\\",\\\"1114\\\":\\\"2\\\",\\\"1115\\\":\\\"1\\\",\\\"1116\\\":\\\"\\\\\\\"\\\",\\\"1117\\\":\\\":\\\",\\\"1118\\\":\\\"\\\\\\\"\\\",\\\"1119\\\":\\\"d\\\",\\\"1120\\\":\\\"\\\\\\\"\\\",\\\"1121\\\":\\\",\\\",\\\"1122\\\":\\\"\\\\\\\"\\\",\\\"1123\\\":\\\"1\\\",\\\"1124\\\":\\\"2\\\",\\\"1125\\\":\\\"2\\\",\\\"1126\\\":\\\"\\\\\\\"\\\",\\\"1127\\\":\\\":\\\",\\\"1128\\\":\\\"\\\\\\\"\\\",\\\"1129\\\":\\\"e\\\",\\\"1130\\\":\\\"\\\\\\\"\\\",\\\"1131\\\":\\\",\\\",\\\"1132\\\":\\\"\\\\\\\"\\\",\\\"1133\\\":\\\"1\\\",\\\"1134\\\":\\\"2\\\",\\\"1135\\\":\\\"3\\\",\\\"1136\\\":\\\"\\\\\\\"\\\",\\\"1137\\\":\\\":\\\",\\\"1138\\\":\\\"\\\\\\\"\\\",\\\"1139\\\":\\\"s\\\",\\\"1140\\\":\\\"\\\\\\\"\\\",\\\"1141\\\":\\\",\\\",\\\"1142\\\":\\\"\\\\\\\"\\\",\\\"1143\\\":\\\"1\\\",\\\"1144\\\":\\\"2\\\",\\\"1145\\\":\\\"4\\\",\\\"1146\\\":\\\"\\\\\\\"\\\",\\\"1147\\\":\\\":\\\",\\\"1148\\\":\\\"\\\\\\\"\\\",\\\"1149\\\":\\\"\\\\\\\\\\\",\\\"1150\\\":\\\"\\\\\\\"\\\",\\\"1151\\\":\\\"\\\\\\\"\\\",\\\"1152\\\":\\\",\\\",\\\"1153\\\":\\\"\\\\\\\"\\\",\\\"1154\\\":\\\"1\\\",\\\"1155\\\":\\\"2\\\",\\\"1156\\\":\\\"5\\\",\\\"1157\\\":\\\"\\\\\\\"\\\",\\\"1158\\\":\\\":\\\",\\\"1159\\\":\\\"\\\\\\\"\\\",\\\"1160\\\":\\\":\\\",\\\"1161\\\":\\\"\\\\\\\"\\\",\\\"1162\\\":\\\",\\\",\\\"1163\\\":\\\"\\\\\\\"\\\",\\\"1164\\\":\\\"1\\\",\\\"1165\\\":\\\"2\\\",\\\"1166\\\":\\\"6\\\",\\\"1167\\\":\\\"\\\\\\\"\\\",\\\"1168\\\":\\\":\\\",\\\"1169\\\":\\\"\\\\\\\"\\\",\\\"1170\\\":\\\"n\\\",\\\"1171\\\":\\\"\\\\\\\"\\\",\\\"1172\\\":\\\",\\\",\\\"1173\\\":\\\"\\\\\\\"\\\",\\\"1174\\\":\\\"1\\\",\\\"1175\\\":\\\"2\\\",\\\"1176\\\":\\\"7\\\",\\\"1177\\\":\\\"\\\\\\\"\\\",\\\"1178\\\":\\\":\\\",\\\"1179\\\":\\\"\\\\\\\"\\\",\\\"1180\\\":\\\"u\\\",\\\"1181\\\":\\\"\\\\\\\"\\\",\\\"1182\\\":\\\",\\\",\\\"1183\\\":\\\"\\\\\\\"\\\",\\\"1184\\\":\\\"1\\\",\\\"1185\\\":\\\"2\\\",\\\"1186\\\":\\\"8\\\",\\\"1187\\\":\\\"\\\\\\\"\\\",\\\"1188\\\":\\\":\\\",\\\"1189\\\":\\\"\\\\\\\"\\\",\\\"1190\\\":\\\"l\\\",\\\"1191\\\":\\\"\\\\\\\"\\\",\\\"1192\\\":\\\",\\\",\\\"1193\\\":\\\"\\\\\\\"\\\",\\\"1194\\\":\\\"1\\\",\\\"1195\\\":\\\"2\\\",\\\"1196\\\":\\\"9\\\",\\\"1197\\\":\\\"\\\\\\\"\\\",\\\"1198\\\":\\\":\\\",\\\"1199\\\":\\\"\\\\\\\"\\\",\\\"1200\\\":\\\"l\\\",\\\"1201\\\":\\\"\\\\\\\"\\\",\\\"1202\\\":\\\",\\\",\\\"1203\\\":\\\"\\\\\\\"\\\",\\\"1204\\\":\\\"1\\\",\\\"1205\\\":\\\"3\\\",\\\"1206\\\":\\\"0\\\",\\\"1207\\\":\\\"\\\\\\\"\\\",\\\"1208\\\":\\\":\\\",\\\"1209\\\":\\\"\\\\\\\"\\\",\\\"1210\\\":\\\",\\\",\\\"1211\\\":\\\"\\\\\\\"\\\",\\\"1212\\\":\\\",\\\",\\\"1213\\\":\\\"\\\\\\\"\\\",\\\"1214\\\":\\\"1\\\",\\\"1215\\\":\\\"3\\\",\\\"1216\\\":\\\"1\\\",\\\"1217\\\":\\\"\\\\\\\"\\\",\\\"1218\\\":\\\":\\\",\\\"1219\\\":\\\"\\\\\\\"\\\",\\\"1220\\\":\\\"\\\\\\\\\\\",\\\"1221\\\":\\\"\\\\\\\"\\\",\\\"1222\\\":\\\"\\\\\\\"\\\",\\\"1223\\\":\\\",\\\",\\\"1224\\\":\\\"\\\\\\\"\\\",\\\"1225\\\":\\\"1\\\",\\\"1226\\\":\\\"3\\\",\\\"1227\\\":\\\"2\\\",\\\"1228\\\":\\\"\\\\\\\"\\\",\\\"1229\\\":\\\":\\\",\\\"1230\\\":\\\"\\\\\\\"\\\",\\\"1231\\\":\\\"i\\\",\\\"1232\\\":\\\"\\\\\\\"\\\",\\\"1233\\\":\\\",\\\",\\\"1234\\\":\\\"\\\\\\\"\\\",\\\"1235\\\":\\\"1\\\",\\\"1236\\\":\\\"3\\\",\\\"1237\\\":\\\"3\\\",\\\"1238\\\":\\\"\\\\\\\"\\\",\\\"1239\\\":\\\":\\\",\\\"1240\\\":\\\"\\\\\\\"\\\",\\\"1241\\\":\\\"n\\\",\\\"1242\\\":\\\"\\\\\\\"\\\",\\\"1243\\\":\\\",\\\",\\\"1244\\\":\\\"\\\\\\\"\\\",\\\"1245\\\":\\\"1\\\",\\\"1246\\\":\\\"3\\\",\\\"1247\\\":\\\"4\\\",\\\"1248\\\":\\\"\\\\\\\"\\\",\\\"1249\\\":\\\":\\\",\\\"1250\\\":\\\"\\\\\\\"\\\",\\\"1251\\\":\\\"i\\\",\\\"1252\\\":\\\"\\\\\\\"\\\",\\\"1253\\\":\\\",\\\",\\\"1254\\\":\\\"\\\\\\\"\\\",\\\"1255\\\":\\\"1\\\",\\\"1256\\\":\\\"3\\\",\\\"1257\\\":\\\"5\\\",\\\"1258\\\":\\\"\\\\\\\"\\\",\\\"1259\\\":\\\":\\\",\\\"1260\\\":\\\"\\\\\\\"\\\",\\\"1261\\\":\\\"t\\\",\\\"1262\\\":\\\"\\\\\\\"\\\",\\\"1263\\\":\\\",\\\",\\\"1264\\\":\\\"\\\\\\\"\\\",\\\"1265\\\":\\\"1\\\",\\\"1266\\\":\\\"3\\\",\\\"1267\\\":\\\"6\\\",\\\"1268\\\":\\\"\\\\\\\"\\\",\\\"1269\\\":\\\":\\\",\\\"1270\\\":\\\"\\\\\\\"\\\",\\\"1271\\\":\\\"i\\\",\\\"1272\\\":\\\"\\\\\\\"\\\",\\\"1273\\\":\\\",\\\",\\\"1274\\\":\\\"\\\\\\\"\\\",\\\"1275\\\":\\\"1\\\",\\\"1276\\\":\\\"3\\\",\\\"1277\\\":\\\"7\\\",\\\"1278\\\":\\\"\\\\\\\"\\\",\\\"1279\\\":\\\":\\\",\\\"1280\\\":\\\"\\\\\\\"\\\",\\\"1281\\\":\\\"a\\\",\\\"1282\\\":\\\"\\\\\\\"\\\",\\\"1283\\\":\\\",\\\",\\\"1284\\\":\\\"\\\\\\\"\\\",\\\"1285\\\":\\\"1\\\",\\\"1286\\\":\\\"3\\\",\\\"1287\\\":\\\"8\\\",\\\"1288\\\":\\\"\\\\\\\"\\\",\\\"1289\\\":\\\":\\\",\\\"1290\\\":\\\"\\\\\\\"\\\",\\\"1291\\\":\\\"t\\\",\\\"1292\\\":\\\"\\\\\\\"\\\",\\\"1293\\\":\\\",\\\",\\\"1294\\\":\\\"\\\\\\\"\\\",\\\"1295\\\":\\\"1\\\",\\\"1296\\\":\\\"3\\\",\\\"1297\\\":\\\"9\\\",\\\"1298\\\":\\\"\\\\\\\"\\\",\\\"1299\\\":\\\":\\\",\\\"1300\\\":\\\"\\\\\\\"\\\",\\\"1301\\\":\\\"e\\\",\\\"1302\\\":\\\"\\\\\\\"\\\",\\\"1303\\\":\\\",\\\",\\\"1304\\\":\\\"\\\\\\\"\\\",\\\"1305\\\":\\\"1\\\",\\\"1306\\\":\\\"4\\\",\\\"1307\\\":\\\"0\\\",\\\"1308\\\":\\\"\\\\\\\"\\\",\\\"1309\\\":\\\":\\\",\\\"1310\\\":\\\"\\\\\\\"\\\",\\\"1311\\\":\\\"d\\\",\\\"1312\\\":\\\"\\\\\\\"\\\",\\\"1313\\\":\\\",\\\",\\\"1314\\\":\\\"\\\\\\\"\\\",\\\"1315\\\":\\\"1\\\",\\\"1316\\\":\\\"4\\\",\\\"1317\\\":\\\"1\\\",\\\"1318\\\":\\\"\\\\\\\"\\\",\\\"1319\\\":\\\":\\\",\\\"1320\\\":\\\"\\\\\\\"\\\",\\\"1321\\\":\\\"_\\\",\\\"1322\\\":\\\"\\\\\\\"\\\",\\\"1323\\\":\\\",\\\",\\\"1324\\\":\\\"\\\\\\\"\\\",\\\"1325\\\":\\\"1\\\",\\\"1326\\\":\\\"4\\\",\\\"1327\\\":\\\"2\\\",\\\"1328\\\":\\\"\\\\\\\"\\\",\\\"1329\\\":\\\":\\\",\\\"1330\\\":\\\"\\\\\\\"\\\",\\\"1331\\\":\\\"a\\\",\\\"1332\\\":\\\"\\\\\\\"\\\",\\\"1333\\\":\\\",\\\",\\\"1334\\\":\\\"\\\\\\\"\\\",\\\"1335\\\":\\\"1\\\",\\\"1336\\\":\\\"4\\\",\\\"1337\\\":\\\"3\\\",\\\"1338\\\":\\\"\\\\\\\"\\\",\\\"1339\\\":\\\":\\\",\\\"1340\\\":\\\"\\\\\\\"\\\",\\\"1341\\\":\\\"t\\\",\\\"1342\\\":\\\"\\\\\\\"\\\",\\\"1343\\\":\\\",\\\",\\\"1344\\\":\\\"\\\\\\\"\\\",\\\"1345\\\":\\\"1\\\",\\\"1346\\\":\\\"4\\\",\\\"1347\\\":\\\"4\\\",\\\"1348\\\":\\\"\\\\\\\"\\\",\\\"1349\\\":\\\":\\\",\\\"1350\\\":\\\"\\\\\\\"\\\",\\\"1351\\\":\\\"\\\\\\\\\\\",\\\"1352\\\":\\\"\\\\\\\"\\\",\\\"1353\\\":\\\"\\\\\\\"\\\",\\\"1354\\\":\\\",\\\",\\\"1355\\\":\\\"\\\\\\\"\\\",\\\"1356\\\":\\\"1\\\",\\\"1357\\\":\\\"4\\\",\\\"1358\\\":\\\"5\\\",\\\"1359\\\":\\\"\\\\\\\"\\\",\\\"1360\\\":\\\":\\\",\\\"1361\\\":\\\"\\\\\\\"\\\",\\\"1362\\\":\\\":\\\",\\\"1363\\\":\\\"\\\\\\\"\\\",\\\"1364\\\":\\\",\\\",\\\"1365\\\":\\\"\\\\\\\"\\\",\\\"1366\\\":\\\"1\\\",\\\"1367\\\":\\\"4\\\",\\\"1368\\\":\\\"6\\\",\\\"1369\\\":\\\"\\\\\\\"\\\",\\\"1370\\\":\\\":\\\",\\\"1371\\\":\\\"\\\\\\\"\\\",\\\"1372\\\":\\\"\\\\\\\\\\\",\\\"1373\\\":\\\"\\\\\\\"\\\",\\\"1374\\\":\\\"\\\\\\\"\\\",\\\"1375\\\":\\\",\\\",\\\"1376\\\":\\\"\\\\\\\"\\\",\\\"1377\\\":\\\"1\\\",\\\"1378\\\":\\\"4\\\",\\\"1379\\\":\\\"7\\\",\\\"1380\\\":\\\"\\\\\\\"\\\",\\\"1381\\\":\\\":\\\",\\\"1382\\\":\\\"\\\\\\\"\\\",\\\"1383\\\":\\\"2\\\",\\\"1384\\\":\\\"\\\\\\\"\\\",\\\"1385\\\":\\\",\\\",\\\"1386\\\":\\\"\\\\\\\"\\\",\\\"1387\\\":\\\"1\\\",\\\"1388\\\":\\\"4\\\",\\\"1389\\\":\\\"8\\\",\\\"1390\\\":\\\"\\\\\\\"\\\",\\\"1391\\\":\\\":\\\",\\\"1392\\\":\\\"\\\\\\\"\\\",\\\"1393\\\":\\\"0\\\",\\\"1394\\\":\\\"\\\\\\\"\\\",\\\"1395\\\":\\\",\\\",\\\"1396\\\":\\\"\\\\\\\"\\\",\\\"1397\\\":\\\"1\\\",\\\"1398\\\":\\\"4\\\",\\\"1399\\\":\\\"9\\\",\\\"1400\\\":\\\"\\\\\\\"\\\",\\\"1401\\\":\\\":\\\",\\\"1402\\\":\\\"\\\\\\\"\\\",\\\"1403\\\":\\\"2\\\",\\\"1404\\\":\\\"\\\\\\\"\\\",\\\"1405\\\":\\\",\\\",\\\"1406\\\":\\\"\\\\\\\"\\\",\\\"1407\\\":\\\"1\\\",\\\"1408\\\":\\\"5\\\",\\\"1409\\\":\\\"0\\\",\\\"1410\\\":\\\"\\\\\\\"\\\",\\\"1411\\\":\\\":\\\",\\\"1412\\\":\\\"\\\\\\\"\\\",\\\"1413\\\":\\\"6\\\",\\\"1414\\\":\\\"\\\\\\\"\\\",\\\"1415\\\":\\\",\\\",\\\"1416\\\":\\\"\\\\\\\"\\\",\\\"1417\\\":\\\"1\\\",\\\"1418\\\":\\\"5\\\",\\\"1419\\\":\\\"1\\\",\\\"1420\\\":\\\"\\\\\\\"\\\",\\\"1421\\\":\\\":\\\",\\\"1422\\\":\\\"\\\\\\\"\\\",\\\"1423\\\":\\\"-\\\",\\\"1424\\\":\\\"\\\\\\\"\\\",\\\"1425\\\":\\\",\\\",\\\"1426\\\":\\\"\\\\\\\"\\\",\\\"1427\\\":\\\"1\\\",\\\"1428\\\":\\\"5\\\",\\\"1429\\\":\\\"2\\\",\\\"1430\\\":\\\"\\\\\\\"\\\",\\\"1431\\\":\\\":\\\",\\\"1432\\\":\\\"\\\\\\\"\\\",\\\"1433\\\":\\\"0\\\",\\\"1434\\\":\\\"\\\\\\\"\\\",\\\"1435\\\":\\\",\\\",\\\"1436\\\":\\\"\\\\\\\"\\\",\\\"1437\\\":\\\"1\\\",\\\"1438\\\":\\\"5\\\",\\\"1439\\\":\\\"3\\\",\\\"1440\\\":\\\"\\\\\\\"\\\",\\\"1441\\\":\\\":\\\",\\\"1442\\\":\\\"\\\\\\\"\\\",\\\"1443\\\":\\\"1\\\",\\\"1444\\\":\\\"\\\\\\\"\\\",\\\"1445\\\":\\\",\\\",\\\"1446\\\":\\\"\\\\\\\"\\\",\\\"1447\\\":\\\"1\\\",\\\"1448\\\":\\\"5\\\",\\\"1449\\\":\\\"4\\\",\\\"1450\\\":\\\"\\\\\\\"\\\",\\\"1451\\\":\\\":\\\",\\\"1452\\\":\\\"\\\\\\\"\\\",\\\"1453\\\":\\\"-\\\",\\\"1454\\\":\\\"\\\\\\\"\\\",\\\"1455\\\":\\\",\\\",\\\"1456\\\":\\\"\\\\\\\"\\\",\\\"1457\\\":\\\"1\\\",\\\"1458\\\":\\\"5\\\",\\\"1459\\\":\\\"5\\\",\\\"1460\\\":\\\"\\\\\\\"\\\",\\\"1461\\\":\\\":\\\",\\\"1462\\\":\\\"\\\\\\\"\\\",\\\"1463\\\":\\\"3\\\",\\\"1464\\\":\\\"\\\\\\\"\\\",\\\"1465\\\":\\\",\\\",\\\"1466\\\":\\\"\\\\\\\"\\\",\\\"1467\\\":\\\"1\\\",\\\"1468\\\":\\\"5\\\",\\\"1469\\\":\\\"6\\\",\\\"1470\\\":\\\"\\\\\\\"\\\",\\\"1471\\\":\\\":\\\",\\\"1472\\\":\\\"\\\\\\\"\\\",\\\"1473\\\":\\\"1\\\",\\\"1474\\\":\\\"\\\\\\\"\\\",\\\"1475\\\":\\\",\\\",\\\"1476\\\":\\\"\\\\\\\"\\\",\\\"1477\\\":\\\"1\\\",\\\"1478\\\":\\\"5\\\",\\\"1479\\\":\\\"7\\\",\\\"1480\\\":\\\"\\\\\\\"\\\",\\\"1481\\\":\\\":\\\",\\\"1482\\\":\\\"\\\\\\\"\\\",\\\"1483\\\":\\\"T\\\",\\\"1484\\\":\\\"\\\\\\\"\\\",\\\"1485\\\":\\\",\\\",\\\"1486\\\":\\\"\\\\\\\"\\\",\\\"1487\\\":\\\"1\\\",\\\"1488\\\":\\\"5\\\",\\\"1489\\\":\\\"8\\\",\\\"1490\\\":\\\"\\\\\\\"\\\",\\\"1491\\\":\\\":\\\",\\\"1492\\\":\\\"\\\\\\\"\\\",\\\"1493\\\":\\\"0\\\",\\\"1494\\\":\\\"\\\\\\\"\\\",\\\"1495\\\":\\\",\\\",\\\"1496\\\":\\\"\\\\\\\"\\\",\\\"1497\\\":\\\"1\\\",\\\"1498\\\":\\\"5\\\",\\\"1499\\\":\\\"9\\\",\\\"1500\\\":\\\"\\\\\\\"\\\",\\\"1501\\\":\\\":\\\",\\\"1502\\\":\\\"\\\\\\\"\\\",\\\"1503\\\":\\\"4\\\",\\\"1504\\\":\\\"\\\\\\\"\\\",\\\"1505\\\":\\\",\\\",\\\"1506\\\":\\\"\\\\\\\"\\\",\\\"1507\\\":\\\"1\\\",\\\"1508\\\":\\\"6\\\",\\\"1509\\\":\\\"0\\\",\\\"1510\\\":\\\"\\\\\\\"\\\",\\\"1511\\\":\\\":\\\",\\\"1512\\\":\\\"\\\\\\\"\\\",\\\"1513\\\":\\\":\\\",\\\"1514\\\":\\\"\\\\\\\"\\\",\\\"1515\\\":\\\",\\\",\\\"1516\\\":\\\"\\\\\\\"\\\",\\\"1517\\\":\\\"1\\\",\\\"1518\\\":\\\"6\\\",\\\"1519\\\":\\\"1\\\",\\\"1520\\\":\\\"\\\\\\\"\\\",\\\"1521\\\":\\\":\\\",\\\"1522\\\":\\\"\\\\\\\"\\\",\\\"1523\\\":\\\"4\\\",\\\"1524\\\":\\\"\\\\\\\"\\\",\\\"1525\\\":\\\",\\\",\\\"1526\\\":\\\"\\\\\\\"\\\",\\\"1527\\\":\\\"1\\\",\\\"1528\\\":\\\"6\\\",\\\"1529\\\":\\\"2\\\",\\\"1530\\\":\\\"\\\\\\\"\\\",\\\"1531\\\":\\\":\\\",\\\"1532\\\":\\\"\\\\\\\"\\\",\\\"1533\\\":\\\"5\\\",\\\"1534\\\":\\\"\\\\\\\"\\\",\\\"1535\\\":\\\",\\\",\\\"1536\\\":\\\"\\\\\\\"\\\",\\\"1537\\\":\\\"1\\\",\\\"1538\\\":\\\"6\\\",\\\"1539\\\":\\\"3\\\",\\\"1540\\\":\\\"\\\\\\\"\\\",\\\"1541\\\":\\\":\\\",\\\"1542\\\":\\\"\\\\\\\"\\\",\\\"1543\\\":\\\":\\\",\\\"1544\\\":\\\"\\\\\\\"\\\",\\\"1545\\\":\\\",\\\",\\\"1546\\\":\\\"\\\\\\\"\\\",\\\"1547\\\":\\\"1\\\",\\\"1548\\\":\\\"6\\\",\\\"1549\\\":\\\"4\\\",\\\"1550\\\":\\\"\\\\\\\"\\\",\\\"1551\\\":\\\":\\\",\\\"1552\\\":\\\"\\\\\\\"\\\",\\\"1553\\\":\\\"2\\\",\\\"1554\\\":\\\"\\\\\\\"\\\",\\\"1555\\\":\\\",\\\",\\\"1556\\\":\\\"\\\\\\\"\\\",\\\"1557\\\":\\\"1\\\",\\\"1558\\\":\\\"6\\\",\\\"1559\\\":\\\"5\\\",\\\"1560\\\":\\\"\\\\\\\"\\\",\\\"1561\\\":\\\":\\\",\\\"1562\\\":\\\"\\\\\\\"\\\",\\\"1563\\\":\\\"5\\\",\\\"1564\\\":\\\"\\\\\\\"\\\",\\\"1565\\\":\\\",\\\",\\\"1566\\\":\\\"\\\\\\\"\\\",\\\"1567\\\":\\\"1\\\",\\\"1568\\\":\\\"6\\\",\\\"1569\\\":\\\"6\\\",\\\"1570\\\":\\\"\\\\\\\"\\\",\\\"1571\\\":\\\":\\\",\\\"1572\\\":\\\"\\\\\\\"\\\",\\\"1573\\\":\\\".\\\",\\\"1574\\\":\\\"\\\\\\\"\\\",\\\"1575\\\":\\\",\\\",\\\"1576\\\":\\\"\\\\\\\"\\\",\\\"1577\\\":\\\"1\\\",\\\"1578\\\":\\\"6\\\",\\\"1579\\\":\\\"7\\\",\\\"1580\\\":\\\"\\\\\\\"\\\",\\\"1581\\\":\\\":\\\",\\\"1582\\\":\\\"\\\\\\\"\\\",\\\"1583\\\":\\\"5\\\",\\\"1584\\\":\\\"\\\\\\\"\\\",\\\"1585\\\":\\\",\\\",\\\"1586\\\":\\\"\\\\\\\"\\\",\\\"1587\\\":\\\"1\\\",\\\"1588\\\":\\\"6\\\",\\\"1589\\\":\\\"8\\\",\\\"1590\\\":\\\"\\\\\\\"\\\",\\\"1591\\\":\\\":\\\",\\\"1592\\\":\\\"\\\\\\\"\\\",\\\"1593\\\":\\\"9\\\",\\\"1594\\\":\\\"\\\\\\\"\\\",\\\"1595\\\":\\\",\\\",\\\"1596\\\":\\\"\\\\\\\"\\\",\\\"1597\\\":\\\"1\\\",\\\"1598\\\":\\\"6\\\",\\\"1599\\\":\\\"9\\\",\\\"1600\\\":\\\"\\\\\\\"\\\",\\\"1601\\\":\\\":\\\",\\\"1602\\\":\\\"\\\\\\\"\\\",\\\"1603\\\":\\\"1\\\",\\\"1604\\\":\\\"\\\\\\\"\\\",\\\"1605\\\":\\\",\\\",\\\"1606\\\":\\\"\\\\\\\"\\\",\\\"1607\\\":\\\"1\\\",\\\"1608\\\":\\\"7\\\",\\\"1609\\\":\\\"0\\\",\\\"1610\\\":\\\"\\\\\\\"\\\",\\\"1611\\\":\\\":\\\",\\\"1612\\\":\\\"\\\\\\\"\\\",\\\"1613\\\":\\\"Z\\\",\\\"1614\\\":\\\"\\\\\\\"\\\",\\\"1615\\\":\\\",\\\",\\\"1616\\\":\\\"\\\\\\\"\\\",\\\"1617\\\":\\\"1\\\",\\\"1618\\\":\\\"7\\\",\\\"1619\\\":\\\"1\\\",\\\"1620\\\":\\\"\\\\\\\"\\\",\\\"1621\\\":\\\":\\\",\\\"1622\\\":\\\"\\\\\\\"\\\",\\\"1623\\\":\\\"\\\\\\\\\\\",\\\"1624\\\":\\\"\\\\\\\"\\\",\\\"1625\\\":\\\"\\\\\\\"\\\",\\\"1626\\\":\\\",\\\",\\\"1627\\\":\\\"\\\\\\\"\\\",\\\"1628\\\":\\\"1\\\",\\\"1629\\\":\\\"7\\\",\\\"1630\\\":\\\"2\\\",\\\"1631\\\":\\\"\\\\\\\"\\\",\\\"1632\\\":\\\":\\\",\\\"1633\\\":\\\"\\\\\\\"\\\",\\\"1634\\\":\\\",\\\",\\\"1635\\\":\\\"\\\\\\\"\\\",\\\"1636\\\":\\\",\\\",\\\"1637\\\":\\\"\\\\\\\"\\\",\\\"1638\\\":\\\"1\\\",\\\"1639\\\":\\\"7\\\",\\\"1640\\\":\\\"3\\\",\\\"1641\\\":\\\"\\\\\\\"\\\",\\\"1642\\\":\\\":\\\",\\\"1643\\\":\\\"\\\\\\\"\\\",\\\"1644\\\":\\\"\\\\\\\\\\\",\\\"1645\\\":\\\"\\\\\\\"\\\",\\\"1646\\\":\\\"\\\\\\\"\\\",\\\"1647\\\":\\\",\\\",\\\"1648\\\":\\\"\\\\\\\"\\\",\\\"1649\\\":\\\"1\\\",\\\"1650\\\":\\\"7\\\",\\\"1651\\\":\\\"4\\\",\\\"1652\\\":\\\"\\\\\\\"\\\",\\\"1653\\\":\\\":\\\",\\\"1654\\\":\\\"\\\\\\\"\\\",\\\"1655\\\":\\\"u\\\",\\\"1656\\\":\\\"\\\\\\\"\\\",\\\"1657\\\":\\\",\\\",\\\"1658\\\":\\\"\\\\\\\"\\\",\\\"1659\\\":\\\"1\\\",\\\"1660\\\":\\\"7\\\",\\\"1661\\\":\\\"5\\\",\\\"1662\\\":\\\"\\\\\\\"\\\",\\\"1663\\\":\\\":\\\",\\\"1664\\\":\\\"\\\\\\\"\\\",\\\"1665\\\":\\\"s\\\",\\\"1666\\\":\\\"\\\\\\\"\\\",\\\"1667\\\":\\\",\\\",\\\"1668\\\":\\\"\\\\\\\"\\\",\\\"1669\\\":\\\"1\\\",\\\"1670\\\":\\\"7\\\",\\\"1671\\\":\\\"6\\\",\\\"1672\\\":\\\"\\\\\\\"\\\",\\\"1673\\\":\\\":\\\",\\\"1674\\\":\\\"\\\\\\\"\\\",\\\"1675\\\":\\\"e\\\",\\\"1676\\\":\\\"\\\\\\\"\\\",\\\"1677\\\":\\\",\\\",\\\"1678\\\":\\\"\\\\\\\"\\\",\\\"1679\\\":\\\"1\\\",\\\"1680\\\":\\\"7\\\",\\\"1681\\\":\\\"7\\\",\\\"1682\\\":\\\"\\\\\\\"\\\",\\\"1683\\\":\\\":\\\",\\\"1684\\\":\\\"\\\\\\\"\\\",\\\"1685\\\":\\\"r\\\",\\\"1686\\\":\\\"\\\\\\\"\\\",\\\"1687\\\":\\\",\\\",\\\"1688\\\":\\\"\\\\\\\"\\\",\\\"1689\\\":\\\"1\\\",\\\"1690\\\":\\\"7\\\",\\\"1691\\\":\\\"8\\\",\\\"1692\\\":\\\"\\\\\\\"\\\",\\\"1693\\\":\\\":\\\",\\\"1694\\\":\\\"\\\\\\\"\\\",\\\"1695\\\":\\\"_\\\",\\\"1696\\\":\\\"\\\\\\\"\\\",\\\"1697\\\":\\\",\\\",\\\"1698\\\":\\\"\\\\\\\"\\\",\\\"1699\\\":\\\"1\\\",\\\"1700\\\":\\\"7\\\",\\\"1701\\\":\\\"9\\\",\\\"1702\\\":\\\"\\\\\\\"\\\",\\\"1703\\\":\\\":\\\",\\\"1704\\\":\\\"\\\\\\\"\\\",\\\"1705\\\":\\\"a\\\",\\\"1706\\\":\\\"\\\\\\\"\\\",\\\"1707\\\":\\\",\\\",\\\"1708\\\":\\\"\\\\\\\"\\\",\\\"1709\\\":\\\"1\\\",\\\"1710\\\":\\\"8\\\",\\\"1711\\\":\\\"0\\\",\\\"1712\\\":\\\"\\\\\\\"\\\",\\\"1713\\\":\\\":\\\",\\\"1714\\\":\\\"\\\\\\\"\\\",\\\"1715\\\":\\\"g\\\",\\\"1716\\\":\\\"\\\\\\\"\\\",\\\"1717\\\":\\\",\\\",\\\"1718\\\":\\\"\\\\\\\"\\\",\\\"1719\\\":\\\"1\\\",\\\"1720\\\":\\\"8\\\",\\\"1721\\\":\\\"1\\\",\\\"1722\\\":\\\"\\\\\\\"\\\",\\\"1723\\\":\\\":\\\",\\\"1724\\\":\\\"\\\\\\\"\\\",\\\"1725\\\":\\\"e\\\",\\\"1726\\\":\\\"\\\\\\\"\\\",\\\"1727\\\":\\\",\\\",\\\"1728\\\":\\\"\\\\\\\"\\\",\\\"1729\\\":\\\"1\\\",\\\"1730\\\":\\\"8\\\",\\\"1731\\\":\\\"2\\\",\\\"1732\\\":\\\"\\\\\\\"\\\",\\\"1733\\\":\\\":\\\",\\\"1734\\\":\\\"\\\\\\\"\\\",\\\"1735\\\":\\\"n\\\",\\\"1736\\\":\\\"\\\\\\\"\\\",\\\"1737\\\":\\\",\\\",\\\"1738\\\":\\\"\\\\\\\"\\\",\\\"1739\\\":\\\"1\\\",\\\"1740\\\":\\\"8\\\",\\\"1741\\\":\\\"3\\\",\\\"1742\\\":\\\"\\\\\\\"\\\",\\\"1743\\\":\\\":\\\",\\\"1744\\\":\\\"\\\\\\\"\\\",\\\"1745\\\":\\\"t\\\",\\\"1746\\\":\\\"\\\\\\\"\\\",\\\"1747\\\":\\\",\\\",\\\"1748\\\":\\\"\\\\\\\"\\\",\\\"1749\\\":\\\"1\\\",\\\"1750\\\":\\\"8\\\",\\\"1751\\\":\\\"4\\\",\\\"1752\\\":\\\"\\\\\\\"\\\",\\\"1753\\\":\\\":\\\",\\\"1754\\\":\\\"\\\\\\\"\\\",\\\"1755\\\":\\\"\\\\\\\\\\\",\\\"1756\\\":\\\"\\\\\\\"\\\",\\\"1757\\\":\\\"\\\\\\\"\\\",\\\"1758\\\":\\\",\\\",\\\"1759\\\":\\\"\\\\\\\"\\\",\\\"1760\\\":\\\"1\\\",\\\"1761\\\":\\\"8\\\",\\\"1762\\\":\\\"5\\\",\\\"1763\\\":\\\"\\\\\\\"\\\",\\\"1764\\\":\\\":\\\",\\\"1765\\\":\\\"\\\\\\\"\\\",\\\"1766\\\":\\\":\\\",\\\"1767\\\":\\\"\\\\\\\"\\\",\\\"1768\\\":\\\",\\\",\\\"1769\\\":\\\"\\\\\\\"\\\",\\\"1770\\\":\\\"1\\\",\\\"1771\\\":\\\"8\\\",\\\"1772\\\":\\\"6\\\",\\\"1773\\\":\\\"\\\\\\\"\\\",\\\"1774\\\":\\\":\\\",\\\"1775\\\":\\\"\\\\\\\"\\\",\\\"1776\\\":\\\"\\\\\\\\\\\",\\\"1777\\\":\\\"\\\\\\\"\\\",\\\"1778\\\":\\\"\\\\\\\"\\\",\\\"1779\\\":\\\",\\\",\\\"1780\\\":\\\"\\\\\\\"\\\",\\\"1781\\\":\\\"1\\\",\\\"1782\\\":\\\"8\\\",\\\"1783\\\":\\\"7\\\",\\\"1784\\\":\\\"\\\\\\\"\\\",\\\"1785\\\":\\\":\\\",\\\"1786\\\":\\\"\\\\\\\"\\\",\\\"1787\\\":\\\"D\\\",\\\"1788\\\":\\\"\\\\\\\"\\\",\\\"1789\\\":\\\",\\\",\\\"1790\\\":\\\"\\\\\\\"\\\",\\\"1791\\\":\\\"1\\\",\\\"1792\\\":\\\"8\\\",\\\"1793\\\":\\\"8\\\",\\\"1794\\\":\\\"\\\\\\\"\\\",\\\"1795\\\":\\\":\\\",\\\"1796\\\":\\\"\\\\\\\"\\\",\\\"1797\\\":\\\"a\\\",\\\"1798\\\":\\\"\\\\\\\"\\\",\\\"1799\\\":\\\",\\\",\\\"1800\\\":\\\"\\\\\\\"\\\",\\\"1801\\\":\\\"1\\\",\\\"1802\\\":\\\"8\\\",\\\"1803\\\":\\\"9\\\",\\\"1804\\\":\\\"\\\\\\\"\\\",\\\"1805\\\":\\\":\\\",\\\"1806\\\":\\\"\\\\\\\"\\\",\\\"1807\\\":\\\"r\\\",\\\"1808\\\":\\\"\\\\\\\"\\\",\\\"1809\\\":\\\",\\\",\\\"1810\\\":\\\"\\\\\\\"\\\",\\\"1811\\\":\\\"1\\\",\\\"1812\\\":\\\"9\\\",\\\"1813\\\":\\\"0\\\",\\\"1814\\\":\\\"\\\\\\\"\\\",\\\"1815\\\":\\\":\\\",\\\"1816\\\":\\\"\\\\\\\"\\\",\\\"1817\\\":\\\"t\\\",\\\"1818\\\":\\\"\\\\\\\"\\\",\\\"1819\\\":\\\",\\\",\\\"1820\\\":\\\"\\\\\\\"\\\",\\\"1821\\\":\\\"1\\\",\\\"1822\\\":\\\"9\\\",\\\"1823\\\":\\\"1\\\",\\\"1824\\\":\\\"\\\\\\\"\\\",\\\"1825\\\":\\\":\\\",\\\"1826\\\":\\\"\\\\\\\"\\\",\\\"1827\\\":\\\"/\\\",\\\"1828\\\":\\\"\\\\\\\"\\\",\\\"1829\\\":\\\",\\\",\\\"1830\\\":\\\"\\\\\\\"\\\",\\\"1831\\\":\\\"1\\\",\\\"1832\\\":\\\"9\\\",\\\"1833\\\":\\\"2\\\",\\\"1834\\\":\\\"\\\\\\\"\\\",\\\"1835\\\":\\\":\\\",\\\"1836\\\":\\\"\\\\\\\"\\\",\\\"1837\\\":\\\"3\\\",\\\"1838\\\":\\\"\\\\\\\"\\\",\\\"1839\\\":\\\",\\\",\\\"1840\\\":\\\"\\\\\\\"\\\",\\\"1841\\\":\\\"1\\\",\\\"1842\\\":\\\"9\\\",\\\"1843\\\":\\\"3\\\",\\\"1844\\\":\\\"\\\\\\\"\\\",\\\"1845\\\":\\\":\\\",\\\"1846\\\":\\\"\\\\\\\"\\\",\\\"1847\\\":\\\".\\\",\\\"1848\\\":\\\"\\\\\\\"\\\",\\\"1849\\\":\\\",\\\",\\\"1850\\\":\\\"\\\\\\\"\\\",\\\"1851\\\":\\\"1\\\",\\\"1852\\\":\\\"9\\\",\\\"1853\\\":\\\"4\\\",\\\"1854\\\":\\\"\\\\\\\"\\\",\\\"1855\\\":\\\":\\\",\\\"1856\\\":\\\"\\\\\\\"\\\",\\\"1857\\\":\\\"1\\\",\\\"1858\\\":\\\"\\\\\\\"\\\",\\\"1859\\\":\\\",\\\",\\\"1860\\\":\\\"\\\\\\\"\\\",\\\"1861\\\":\\\"1\\\",\\\"1862\\\":\\\"9\\\",\\\"1863\\\":\\\"5\\\",\\\"1864\\\":\\\"\\\\\\\"\\\",\\\"1865\\\":\\\":\\\",\\\"1866\\\":\\\"\\\\\\\"\\\",\\\"1867\\\":\\\"0\\\",\\\"1868\\\":\\\"\\\\\\\"\\\",\\\"1869\\\":\\\",\\\",\\\"1870\\\":\\\"\\\\\\\"\\\",\\\"1871\\\":\\\"1\\\",\\\"1872\\\":\\\"9\\\",\\\"1873\\\":\\\"6\\\",\\\"1874\\\":\\\"\\\\\\\"\\\",\\\"1875\\\":\\\":\\\",\\\"1876\\\":\\\"\\\\\\\"\\\",\\\"1877\\\":\\\" \\\",\\\"1878\\\":\\\"\\\\\\\"\\\",\\\"1879\\\":\\\",\\\",\\\"1880\\\":\\\"\\\\\\\"\\\",\\\"1881\\\":\\\"1\\\",\\\"1882\\\":\\\"9\\\",\\\"1883\\\":\\\"7\\\",\\\"1884\\\":\\\"\\\\\\\"\\\",\\\"1885\\\":\\\":\\\",\\\"1886\\\":\\\"\\\\\\\"\\\",\\\"1887\\\":\\\"(\\\",\\\"1888\\\":\\\"\\\\\\\"\\\",\\\"1889\\\":\\\",\\\",\\\"1890\\\":\\\"\\\\\\\"\\\",\\\"1891\\\":\\\"1\\\",\\\"1892\\\":\\\"9\\\",\\\"1893\\\":\\\"8\\\",\\\"1894\\\":\\\"\\\\\\\"\\\",\\\"1895\\\":\\\":\\\",\\\"1896\\\":\\\"\\\\\\\"\\\",\\\"1897\\\":\\\"d\\\",\\\"1898\\\":\\\"\\\\\\\"\\\",\\\"1899\\\":\\\",\\\",\\\"1900\\\":\\\"\\\\\\\"\\\",\\\"1901\\\":\\\"1\\\",\\\"1902\\\":\\\"9\\\",\\\"1903\\\":\\\"9\\\",\\\"1904\\\":\\\"\\\\\\\"\\\",\\\"1905\\\":\\\":\\\",\\\"1906\\\":\\\"\\\\\\\"\\\",\\\"1907\\\":\\\"a\\\",\\\"1908\\\":\\\"\\\\\\\"\\\",\\\"1909\\\":\\\",\\\",\\\"1910\\\":\\\"\\\\\\\"\\\",\\\"1911\\\":\\\"2\\\",\\\"1912\\\":\\\"0\\\",\\\"1913\\\":\\\"0\\\",\\\"1914\\\":\\\"\\\\\\\"\\\",\\\"1915\\\":\\\":\\\",\\\"1916\\\":\\\"\\\\\\\"\\\",\\\"1917\\\":\\\"r\\\",\\\"1918\\\":\\\"\\\\\\\"\\\",\\\"1919\\\":\\\",\\\",\\\"1920\\\":\\\"\\\\\\\"\\\",\\\"1921\\\":\\\"2\\\",\\\"1922\\\":\\\"0\\\",\\\"1923\\\":\\\"1\\\",\\\"1924\\\":\\\"\\\\\\\"\\\",\\\"1925\\\":\\\":\\\",\\\"1926\\\":\\\"\\\\\\\"\\\",\\\"1927\\\":\\\"t\\\",\\\"1928\\\":\\\"\\\\\\\"\\\",\\\"1929\\\":\\\",\\\",\\\"1930\\\":\\\"\\\\\\\"\\\",\\\"1931\\\":\\\"2\\\",\\\"1932\\\":\\\"0\\\",\\\"1933\\\":\\\"2\\\",\\\"1934\\\":\\\"\\\\\\\"\\\",\\\"1935\\\":\\\":\\\",\\\"1936\\\":\\\"\\\\\\\"\\\",\\\"1937\\\":\\\":\\\",\\\"1938\\\":\\\"\\\\\\\"\\\",\\\"1939\\\":\\\",\\\",\\\"1940\\\":\\\"\\\\\\\"\\\",\\\"1941\\\":\\\"2\\\",\\\"1942\\\":\\\"0\\\",\\\"1943\\\":\\\"3\\\",\\\"1944\\\":\\\"\\\\\\\"\\\",\\\"1945\\\":\\\":\\\",\\\"1946\\\":\\\"\\\\\\\"\\\",\\\"1947\\\":\\\"i\\\",\\\"1948\\\":\\\"\\\\\\\"\\\",\\\"1949\\\":\\\",\\\",\\\"1950\\\":\\\"\\\\\\\"\\\",\\\"1951\\\":\\\"2\\\",\\\"1952\\\":\\\"0\\\",\\\"1953\\\":\\\"4\\\",\\\"1954\\\":\\\"\\\\\\\"\\\",\\\"1955\\\":\\\":\\\",\\\"1956\\\":\\\"\\\\\\\"\\\",\\\"1957\\\":\\\"o\\\",\\\"1958\\\":\\\"\\\\\\\"\\\",\\\"1959\\\":\\\",\\\",\\\"1960\\\":\\\"\\\\\\\"\\\",\\\"1961\\\":\\\"2\\\",\\\"1962\\\":\\\"0\\\",\\\"1963\\\":\\\"5\\\",\\\"1964\\\":\\\"\\\\\\\"\\\",\\\"1965\\\":\\\":\\\",\\\"1966\\\":\\\"\\\\\\\"\\\",\\\"1967\\\":\\\")\\\",\\\"1968\\\":\\\"\\\\\\\"\\\",\\\"1969\\\":\\\",\\\",\\\"1970\\\":\\\"\\\\\\\"\\\",\\\"1971\\\":\\\"2\\\",\\\"1972\\\":\\\"0\\\",\\\"1973\\\":\\\"6\\\",\\\"1974\\\":\\\"\\\\\\\"\\\",\\\"1975\\\":\\\":\\\",\\\"1976\\\":\\\"\\\\\\\"\\\",\\\"1977\\\":\\\"\\\\\\\\\\\",\\\"1978\\\":\\\"\\\\\\\"\\\",\\\"1979\\\":\\\"\\\\\\\"\\\",\\\"1980\\\":\\\",\\\",\\\"1981\\\":\\\"\\\\\\\"\\\",\\\"1982\\\":\\\"2\\\",\\\"1983\\\":\\\"0\\\",\\\"1984\\\":\\\"7\\\",\\\"1985\\\":\\\"\\\\\\\"\\\",\\\"1986\\\":\\\":\\\",\\\"1987\\\":\\\"\\\\\\\"\\\",\\\"1988\\\":\\\"}\\\",\\\"1989\\\":\\\"\\\\\\\"\\\",\\\"1990\\\":\\\",\\\",\\\"1991\\\":\\\"\\\\\\\"\\\",\\\"1992\\\":\\\"p\\\",\\\"1993\\\":\\\"a\\\",\\\"1994\\\":\\\"y\\\",\\\"1995\\\":\\\"m\\\",\\\"1996\\\":\\\"e\\\",\\\"1997\\\":\\\"n\\\",\\\"1998\\\":\\\"t\\\",\\\"1999\\\":\\\"_\\\",\\\"2000\\\":\\\"f\\\",\\\"2001\\\":\\\"a\\\",\\\"2002\\\":\\\"i\\\",\\\"2003\\\":\\\"l\\\",\\\"2004\\\":\\\"e\\\",\\\"2005\\\":\\\"d\\\",\\\"2006\\\":\\\"_\\\",\\\"2007\\\":\\\"a\\\",\\\"2008\\\":\\\"t\\\",\\\"2009\\\":\\\"\\\\\\\"\\\",\\\"2010\\\":\\\":\\\",\\\"2011\\\":\\\"\\\\\\\"\\\",\\\"2012\\\":\\\"2\\\",\\\"2013\\\":\\\"0\\\",\\\"2014\\\":\\\"2\\\",\\\"2015\\\":\\\"6\\\",\\\"2016\\\":\\\"-\\\",\\\"2017\\\":\\\"0\\\",\\\"2018\\\":\\\"1\\\",\\\"2019\\\":\\\"-\\\",\\\"2020\\\":\\\"3\\\",\\\"2021\\\":\\\"1\\\",\\\"2022\\\":\\\"T\\\",\\\"2023\\\":\\\"0\\\",\\\"2024\\\":\\\"4\\\",\\\"2025\\\":\\\":\\\",\\\"2026\\\":\\\"4\\\",\\\"2027\\\":\\\"5\\\",\\\"2028\\\":\\\":\\\",\\\"2029\\\":\\\"4\\\",\\\"2030\\\":\\\"1\\\",\\\"2031\\\":\\\".\\\",\\\"2032\\\":\\\"3\\\",\\\"2033\\\":\\\"3\\\",\\\"2034\\\":\\\"6\\\",\\\"2035\\\":\\\"Z\\\",\\\"2036\\\":\\\"\\\\\\\"\\\",\\\"2037\\\":\\\",\\\",\\\"2038\\\":\\\"\\\\\\\"\\\",\\\"2039\\\":\\\"f\\\",\\\"2040\\\":\\\"a\\\",\\\"2041\\\":\\\"i\\\",\\\"2042\\\":\\\"l\\\",\\\"2043\\\":\\\"u\\\",\\\"2044\\\":\\\"r\\\",\\\"2045\\\":\\\"e\\\",\\\"2046\\\":\\\"_\\\",\\\"2047\\\":\\\"r\\\",\\\"2048\\\":\\\"e\\\",\\\"2049\\\":\\\"a\\\",\\\"2050\\\":\\\"s\\\",\\\"2051\\\":\\\"o\\\",\\\"2052\\\":\\\"n\\\",\\\"2053\\\":\\\"\\\\\\\"\\\",\\\"2054\\\":\\\":\\\",\\\"2055\\\":\\\"\\\\\\\"\\\",\\\"2056\\\":\\\"N\\\",\\\"2057\\\":\\\"A\\\",\\\"2058\\\":\\\"\\\\\\\"\\\",\\\"2059\\\":\\\",\\\",\\\"2060\\\":\\\"\\\\\\\"\\\",\\\"2061\\\":\\\"e\\\",\\\"2062\\\":\\\"a\\\",\\\"2063\\\":\\\"s\\\",\\\"2064\\\":\\\"e\\\",\\\"2065\\\":\\\"p\\\",\\\"2066\\\":\\\"a\\\",\\\"2067\\\":\\\"y\\\",\\\"2068\\\":\\\"i\\\",\\\"2069\\\":\\\"d\\\",\\\"2070\\\":\\\"\\\\\\\"\\\",\\\"2071\\\":\\\":\\\",\\\"2072\\\":\\\"\\\\\\\"\\\",\\\"2073\\\":\\\"S\\\",\\\"2074\\\":\\\"2\\\",\\\"2075\\\":\\\"6\\\",\\\"2076\\\":\\\"0\\\",\\\"2077\\\":\\\"1\\\",\\\"2078\\\":\\\"3\\\",\\\"2079\\\":\\\"1\\\",\\\"2080\\\":\\\"0\\\",\\\"2081\\\":\\\"7\\\",\\\"2082\\\":\\\"4\\\",\\\"2083\\\":\\\"J\\\",\\\"2084\\\":\\\"4\\\",\\\"2085\\\":\\\"V\\\",\\\"2086\\\":\\\"H\\\",\\\"2087\\\":\\\"\\\\\\\"\\\",\\\"2088\\\":\\\",\\\",\\\"2089\\\":\\\"\\\\\\\"\\\",\\\"2090\\\":\\\"b\\\",\\\"2091\\\":\\\"a\\\",\\\"2092\\\":\\\"n\\\",\\\"2093\\\":\\\"k\\\",\\\"2094\\\":\\\"_\\\",\\\"2095\\\":\\\"r\\\",\\\"2096\\\":\\\"e\\\",\\\"2097\\\":\\\"f\\\",\\\"2098\\\":\\\"_\\\",\\\"2099\\\":\\\"n\\\",\\\"2100\\\":\\\"u\\\",\\\"2101\\\":\\\"m\\\",\\\"2102\\\":\\\"\\\\\\\"\\\",\\\"2103\\\":\\\":\\\",\\\"2104\\\":\\\"\\\\\\\"\\\",\\\"2105\\\":\\\"N\\\",\\\"2106\\\":\\\"A\\\",\\\"2107\\\":\\\"\\\\\\\"\\\",\\\"2108\\\":\\\"}\\\",\\\"payment_failed_at\\\":\\\"2026-01-31T04:45:41.374Z\\\",\\\"failure_reason\\\":\\\"NA\\\",\\\"easepayid\\\":\\\"S260131074J4VH\\\",\\\"bank_ref_num\\\":\\\"NA\\\"}\"', '2026-01-31 10:15:25', '2026-01-31 10:15:41');
INSERT INTO `driver_subscriptions` (`id`, `driver_id`, `plan_id`, `transaction_id`, `subscription_number`, `start_date`, `end_date`, `rides_remaining`, `rides_used`, `total_rides`, `amount_paid`, `payment_status`, `payment_method`, `payment_gateway`, `gateway_transaction_id`, `gateway_payment_id`, `gateway_order_id`, `status`, `auto_renew`, `cancelled_at`, `cancellation_reason`, `metadata`, `created_at`, `updated_at`) VALUES
(3, 46, 2, 'SUB_c5439d19_53c4_4e', 'SUBSC-1769834743808-46', '2026-01-31 10:15:43', '2026-03-02 10:15:43', NULL, 0, NULL, 999.00, 'pending', 'easebuzz', 'easebuzz', NULL, NULL, 'SUB_c5439d19_53c4_4e', 'active', 0, NULL, NULL, '\"{\\\"plan_name\\\":\\\"Standard - 30 Days\\\",\\\"plan_description\\\":\\\"Zero commission for 30 days\\\",\\\"commission_waiver\\\":true,\\\"max_daily_rides\\\":null,\\\"initiated_at\\\":\\\"2026-01-31T04:45:43.809Z\\\",\\\"user_agent\\\":\\\"Dart/3.10 (dart:io)\\\"}\"', '2026-01-31 10:15:43', '2026-01-31 10:15:43'),
(4, 46, 2, 'SUB_78fedbd4_bf4e_40', 'SUBSC-1769835582214-46', '2026-01-31 10:29:42', '2026-03-02 10:29:42', NULL, 0, NULL, 999.00, 'completed', 'easebuzz', 'easebuzz', 'S260131074J4W4', 'S260131074J4W4', 'SUB_78fedbd4_bf4e_40', 'active', 0, NULL, NULL, '\"{\\\"0\\\":\\\"{\\\",\\\"1\\\":\\\"\\\\\\\"\\\",\\\"2\\\":\\\"p\\\",\\\"3\\\":\\\"l\\\",\\\"4\\\":\\\"a\\\",\\\"5\\\":\\\"n\\\",\\\"6\\\":\\\"_\\\",\\\"7\\\":\\\"n\\\",\\\"8\\\":\\\"a\\\",\\\"9\\\":\\\"m\\\",\\\"10\\\":\\\"e\\\",\\\"11\\\":\\\"\\\\\\\"\\\",\\\"12\\\":\\\":\\\",\\\"13\\\":\\\"\\\\\\\"\\\",\\\"14\\\":\\\"S\\\",\\\"15\\\":\\\"t\\\",\\\"16\\\":\\\"a\\\",\\\"17\\\":\\\"n\\\",\\\"18\\\":\\\"d\\\",\\\"19\\\":\\\"a\\\",\\\"20\\\":\\\"r\\\",\\\"21\\\":\\\"d\\\",\\\"22\\\":\\\" \\\",\\\"23\\\":\\\"-\\\",\\\"24\\\":\\\" \\\",\\\"25\\\":\\\"3\\\",\\\"26\\\":\\\"0\\\",\\\"27\\\":\\\" \\\",\\\"28\\\":\\\"D\\\",\\\"29\\\":\\\"a\\\",\\\"30\\\":\\\"y\\\",\\\"31\\\":\\\"s\\\",\\\"32\\\":\\\"\\\\\\\"\\\",\\\"33\\\":\\\",\\\",\\\"34\\\":\\\"\\\\\\\"\\\",\\\"35\\\":\\\"p\\\",\\\"36\\\":\\\"l\\\",\\\"37\\\":\\\"a\\\",\\\"38\\\":\\\"n\\\",\\\"39\\\":\\\"_\\\",\\\"40\\\":\\\"d\\\",\\\"41\\\":\\\"e\\\",\\\"42\\\":\\\"s\\\",\\\"43\\\":\\\"c\\\",\\\"44\\\":\\\"r\\\",\\\"45\\\":\\\"i\\\",\\\"46\\\":\\\"p\\\",\\\"47\\\":\\\"t\\\",\\\"48\\\":\\\"i\\\",\\\"49\\\":\\\"o\\\",\\\"50\\\":\\\"n\\\",\\\"51\\\":\\\"\\\\\\\"\\\",\\\"52\\\":\\\":\\\",\\\"53\\\":\\\"\\\\\\\"\\\",\\\"54\\\":\\\"Z\\\",\\\"55\\\":\\\"e\\\",\\\"56\\\":\\\"r\\\",\\\"57\\\":\\\"o\\\",\\\"58\\\":\\\" \\\",\\\"59\\\":\\\"c\\\",\\\"60\\\":\\\"o\\\",\\\"61\\\":\\\"m\\\",\\\"62\\\":\\\"m\\\",\\\"63\\\":\\\"i\\\",\\\"64\\\":\\\"s\\\",\\\"65\\\":\\\"s\\\",\\\"66\\\":\\\"i\\\",\\\"67\\\":\\\"o\\\",\\\"68\\\":\\\"n\\\",\\\"69\\\":\\\" \\\",\\\"70\\\":\\\"f\\\",\\\"71\\\":\\\"o\\\",\\\"72\\\":\\\"r\\\",\\\"73\\\":\\\" \\\",\\\"74\\\":\\\"3\\\",\\\"75\\\":\\\"0\\\",\\\"76\\\":\\\" \\\",\\\"77\\\":\\\"d\\\",\\\"78\\\":\\\"a\\\",\\\"79\\\":\\\"y\\\",\\\"80\\\":\\\"s\\\",\\\"81\\\":\\\"\\\\\\\"\\\",\\\"82\\\":\\\",\\\",\\\"83\\\":\\\"\\\\\\\"\\\",\\\"84\\\":\\\"c\\\",\\\"85\\\":\\\"o\\\",\\\"86\\\":\\\"m\\\",\\\"87\\\":\\\"m\\\",\\\"88\\\":\\\"i\\\",\\\"89\\\":\\\"s\\\",\\\"90\\\":\\\"s\\\",\\\"91\\\":\\\"i\\\",\\\"92\\\":\\\"o\\\",\\\"93\\\":\\\"n\\\",\\\"94\\\":\\\"_\\\",\\\"95\\\":\\\"w\\\",\\\"96\\\":\\\"a\\\",\\\"97\\\":\\\"i\\\",\\\"98\\\":\\\"v\\\",\\\"99\\\":\\\"e\\\",\\\"100\\\":\\\"r\\\",\\\"101\\\":\\\"\\\\\\\"\\\",\\\"102\\\":\\\":\\\",\\\"103\\\":\\\"t\\\",\\\"104\\\":\\\"r\\\",\\\"105\\\":\\\"u\\\",\\\"106\\\":\\\"e\\\",\\\"107\\\":\\\",\\\",\\\"108\\\":\\\"\\\\\\\"\\\",\\\"109\\\":\\\"m\\\",\\\"110\\\":\\\"a\\\",\\\"111\\\":\\\"x\\\",\\\"112\\\":\\\"_\\\",\\\"113\\\":\\\"d\\\",\\\"114\\\":\\\"a\\\",\\\"115\\\":\\\"i\\\",\\\"116\\\":\\\"l\\\",\\\"117\\\":\\\"y\\\",\\\"118\\\":\\\"_\\\",\\\"119\\\":\\\"r\\\",\\\"120\\\":\\\"i\\\",\\\"121\\\":\\\"d\\\",\\\"122\\\":\\\"e\\\",\\\"123\\\":\\\"s\\\",\\\"124\\\":\\\"\\\\\\\"\\\",\\\"125\\\":\\\":\\\",\\\"126\\\":\\\"n\\\",\\\"127\\\":\\\"u\\\",\\\"128\\\":\\\"l\\\",\\\"129\\\":\\\"l\\\",\\\"130\\\":\\\",\\\",\\\"131\\\":\\\"\\\\\\\"\\\",\\\"132\\\":\\\"i\\\",\\\"133\\\":\\\"n\\\",\\\"134\\\":\\\"i\\\",\\\"135\\\":\\\"t\\\",\\\"136\\\":\\\"i\\\",\\\"137\\\":\\\"a\\\",\\\"138\\\":\\\"t\\\",\\\"139\\\":\\\"e\\\",\\\"140\\\":\\\"d\\\",\\\"141\\\":\\\"_\\\",\\\"142\\\":\\\"a\\\",\\\"143\\\":\\\"t\\\",\\\"144\\\":\\\"\\\\\\\"\\\",\\\"145\\\":\\\":\\\",\\\"146\\\":\\\"\\\\\\\"\\\",\\\"147\\\":\\\"2\\\",\\\"148\\\":\\\"0\\\",\\\"149\\\":\\\"2\\\",\\\"150\\\":\\\"6\\\",\\\"151\\\":\\\"-\\\",\\\"152\\\":\\\"0\\\",\\\"153\\\":\\\"1\\\",\\\"154\\\":\\\"-\\\",\\\"155\\\":\\\"3\\\",\\\"156\\\":\\\"1\\\",\\\"157\\\":\\\"T\\\",\\\"158\\\":\\\"0\\\",\\\"159\\\":\\\"4\\\",\\\"160\\\":\\\":\\\",\\\"161\\\":\\\"5\\\",\\\"162\\\":\\\"9\\\",\\\"163\\\":\\\":\\\",\\\"164\\\":\\\"4\\\",\\\"165\\\":\\\"2\\\",\\\"166\\\":\\\".\\\",\\\"167\\\":\\\"2\\\",\\\"168\\\":\\\"1\\\",\\\"169\\\":\\\"4\\\",\\\"170\\\":\\\"Z\\\",\\\"171\\\":\\\"\\\\\\\"\\\",\\\"172\\\":\\\",\\\",\\\"173\\\":\\\"\\\\\\\"\\\",\\\"174\\\":\\\"u\\\",\\\"175\\\":\\\"s\\\",\\\"176\\\":\\\"e\\\",\\\"177\\\":\\\"r\\\",\\\"178\\\":\\\"_\\\",\\\"179\\\":\\\"a\\\",\\\"180\\\":\\\"g\\\",\\\"181\\\":\\\"e\\\",\\\"182\\\":\\\"n\\\",\\\"183\\\":\\\"t\\\",\\\"184\\\":\\\"\\\\\\\"\\\",\\\"185\\\":\\\":\\\",\\\"186\\\":\\\"\\\\\\\"\\\",\\\"187\\\":\\\"D\\\",\\\"188\\\":\\\"a\\\",\\\"189\\\":\\\"r\\\",\\\"190\\\":\\\"t\\\",\\\"191\\\":\\\"/\\\",\\\"192\\\":\\\"3\\\",\\\"193\\\":\\\".\\\",\\\"194\\\":\\\"1\\\",\\\"195\\\":\\\"0\\\",\\\"196\\\":\\\" \\\",\\\"197\\\":\\\"(\\\",\\\"198\\\":\\\"d\\\",\\\"199\\\":\\\"a\\\",\\\"200\\\":\\\"r\\\",\\\"201\\\":\\\"t\\\",\\\"202\\\":\\\":\\\",\\\"203\\\":\\\"i\\\",\\\"204\\\":\\\"o\\\",\\\"205\\\":\\\")\\\",\\\"206\\\":\\\"\\\\\\\"\\\",\\\"207\\\":\\\",\\\",\\\"208\\\":\\\"\\\\\\\"\\\",\\\"209\\\":\\\"i\\\",\\\"210\\\":\\\"s\\\",\\\"211\\\":\\\"_\\\",\\\"212\\\":\\\"q\\\",\\\"213\\\":\\\"u\\\",\\\"214\\\":\\\"e\\\",\\\"215\\\":\\\"u\\\",\\\"216\\\":\\\"e\\\",\\\"217\\\":\\\"d\\\",\\\"218\\\":\\\"\\\\\\\"\\\",\\\"219\\\":\\\":\\\",\\\"220\\\":\\\"f\\\",\\\"221\\\":\\\"a\\\",\\\"222\\\":\\\"l\\\",\\\"223\\\":\\\"s\\\",\\\"224\\\":\\\"e\\\",\\\"225\\\":\\\",\\\",\\\"226\\\":\\\"\\\\\\\"\\\",\\\"227\\\":\\\"q\\\",\\\"228\\\":\\\"u\\\",\\\"229\\\":\\\"e\\\",\\\"230\\\":\\\"u\\\",\\\"231\\\":\\\"e\\\",\\\"232\\\":\\\"d\\\",\\\"233\\\":\\\"_\\\",\\\"234\\\":\\\"a\\\",\\\"235\\\":\\\"f\\\",\\\"236\\\":\\\"t\\\",\\\"237\\\":\\\"e\\\",\\\"238\\\":\\\"r\\\",\\\"239\\\":\\\"_\\\",\\\"240\\\":\\\"s\\\",\\\"241\\\":\\\"u\\\",\\\"242\\\":\\\"b\\\",\\\"243\\\":\\\"s\\\",\\\"244\\\":\\\"c\\\",\\\"245\\\":\\\"r\\\",\\\"246\\\":\\\"i\\\",\\\"247\\\":\\\"p\\\",\\\"248\\\":\\\"t\\\",\\\"249\\\":\\\"i\\\",\\\"250\\\":\\\"o\\\",\\\"251\\\":\\\"n\\\",\\\"252\\\":\\\"\\\\\\\"\\\",\\\"253\\\":\\\":\\\",\\\"254\\\":\\\"n\\\",\\\"255\\\":\\\"u\\\",\\\"256\\\":\\\"l\\\",\\\"257\\\":\\\"l\\\",\\\"258\\\":\\\",\\\",\\\"259\\\":\\\"\\\\\\\"\\\",\\\"260\\\":\\\"c\\\",\\\"261\\\":\\\"u\\\",\\\"262\\\":\\\"r\\\",\\\"263\\\":\\\"r\\\",\\\"264\\\":\\\"e\\\",\\\"265\\\":\\\"n\\\",\\\"266\\\":\\\"t\\\",\\\"267\\\":\\\"_\\\",\\\"268\\\":\\\"s\\\",\\\"269\\\":\\\"u\\\",\\\"270\\\":\\\"b\\\",\\\"271\\\":\\\"s\\\",\\\"272\\\":\\\"c\\\",\\\"273\\\":\\\"r\\\",\\\"274\\\":\\\"i\\\",\\\"275\\\":\\\"p\\\",\\\"276\\\":\\\"t\\\",\\\"277\\\":\\\"i\\\",\\\"278\\\":\\\"o\\\",\\\"279\\\":\\\"n\\\",\\\"280\\\":\\\"_\\\",\\\"281\\\":\\\"e\\\",\\\"282\\\":\\\"n\\\",\\\"283\\\":\\\"d\\\",\\\"284\\\":\\\"_\\\",\\\"285\\\":\\\"d\\\",\\\"286\\\":\\\"a\\\",\\\"287\\\":\\\"t\\\",\\\"288\\\":\\\"e\\\",\\\"289\\\":\\\"\\\\\\\"\\\",\\\"290\\\":\\\":\\\",\\\"291\\\":\\\"n\\\",\\\"292\\\":\\\"u\\\",\\\"293\\\":\\\"l\\\",\\\"294\\\":\\\"l\\\",\\\"295\\\":\\\",\\\",\\\"296\\\":\\\"\\\\\\\"\\\",\\\"297\\\":\\\"c\\\",\\\"298\\\":\\\"u\\\",\\\"299\\\":\\\"r\\\",\\\"300\\\":\\\"r\\\",\\\"301\\\":\\\"e\\\",\\\"302\\\":\\\"n\\\",\\\"303\\\":\\\"t\\\",\\\"304\\\":\\\"_\\\",\\\"305\\\":\\\"s\\\",\\\"306\\\":\\\"u\\\",\\\"307\\\":\\\"b\\\",\\\"308\\\":\\\"s\\\",\\\"309\\\":\\\"c\\\",\\\"310\\\":\\\"r\\\",\\\"311\\\":\\\"i\\\",\\\"312\\\":\\\"p\\\",\\\"313\\\":\\\"t\\\",\\\"314\\\":\\\"i\\\",\\\"315\\\":\\\"o\\\",\\\"316\\\":\\\"n\\\",\\\"317\\\":\\\"_\\\",\\\"318\\\":\\\"r\\\",\\\"319\\\":\\\"i\\\",\\\"320\\\":\\\"d\\\",\\\"321\\\":\\\"e\\\",\\\"322\\\":\\\"s\\\",\\\"323\\\":\\\"_\\\",\\\"324\\\":\\\"r\\\",\\\"325\\\":\\\"e\\\",\\\"326\\\":\\\"m\\\",\\\"327\\\":\\\"a\\\",\\\"328\\\":\\\"i\\\",\\\"329\\\":\\\"n\\\",\\\"330\\\":\\\"i\\\",\\\"331\\\":\\\"n\\\",\\\"332\\\":\\\"g\\\",\\\"333\\\":\\\"\\\\\\\"\\\",\\\"334\\\":\\\":\\\",\\\"335\\\":\\\"n\\\",\\\"336\\\":\\\"u\\\",\\\"337\\\":\\\"l\\\",\\\"338\\\":\\\"l\\\",\\\"339\\\":\\\"}\\\",\\\"payment_completed_at\\\":\\\"2026-01-31T05:00:19.218Z\\\",\\\"easepayid\\\":\\\"S260131074J4W4\\\",\\\"bank_ref_num\\\":\\\"660330676528\\\",\\\"webhook_received_at\\\":\\\"2026-01-31T05:00:19.218Z\\\"}\"', '2026-01-31 10:29:42', '2026-01-31 10:30:19');
INSERT INTO `driver_subscriptions` (`id`, `driver_id`, `plan_id`, `transaction_id`, `subscription_number`, `start_date`, `end_date`, `rides_remaining`, `rides_used`, `total_rides`, `amount_paid`, `payment_status`, `payment_method`, `payment_gateway`, `gateway_transaction_id`, `gateway_payment_id`, `gateway_order_id`, `status`, `auto_renew`, `cancelled_at`, `cancellation_reason`, `metadata`, `created_at`, `updated_at`) VALUES
(5, 50, 2, 'SUB_cb127cfb_c6a4_4e', 'SUBSC-1769852215050-50', '2026-01-31 15:06:55', '2026-03-02 15:06:55', NULL, 0, NULL, 999.00, 'failed', 'easebuzz', 'easebuzz', NULL, NULL, 'SUB_cb127cfb_c6a4_4e', 'cancelled', 0, '2026-01-31 15:10:12', 'NA', '\"{\\\"0\\\":\\\"{\\\",\\\"1\\\":\\\"\\\\\\\"\\\",\\\"2\\\":\\\"0\\\",\\\"3\\\":\\\"\\\\\\\"\\\",\\\"4\\\":\\\":\\\",\\\"5\\\":\\\"\\\\\\\"\\\",\\\"6\\\":\\\"{\\\",\\\"7\\\":\\\"\\\\\\\"\\\",\\\"8\\\":\\\",\\\",\\\"9\\\":\\\"\\\\\\\"\\\",\\\"10\\\":\\\"1\\\",\\\"11\\\":\\\"\\\\\\\"\\\",\\\"12\\\":\\\":\\\",\\\"13\\\":\\\"\\\\\\\"\\\",\\\"14\\\":\\\"\\\\\\\\\\\",\\\"15\\\":\\\"\\\\\\\"\\\",\\\"16\\\":\\\"\\\\\\\"\\\",\\\"17\\\":\\\",\\\",\\\"18\\\":\\\"\\\\\\\"\\\",\\\"19\\\":\\\"2\\\",\\\"20\\\":\\\"\\\\\\\"\\\",\\\"21\\\":\\\":\\\",\\\"22\\\":\\\"\\\\\\\"\\\",\\\"23\\\":\\\"p\\\",\\\"24\\\":\\\"\\\\\\\"\\\",\\\"25\\\":\\\",\\\",\\\"26\\\":\\\"\\\\\\\"\\\",\\\"27\\\":\\\"3\\\",\\\"28\\\":\\\"\\\\\\\"\\\",\\\"29\\\":\\\":\\\",\\\"30\\\":\\\"\\\\\\\"\\\",\\\"31\\\":\\\"l\\\",\\\"32\\\":\\\"\\\\\\\"\\\",\\\"33\\\":\\\",\\\",\\\"34\\\":\\\"\\\\\\\"\\\",\\\"35\\\":\\\"4\\\",\\\"36\\\":\\\"\\\\\\\"\\\",\\\"37\\\":\\\":\\\",\\\"38\\\":\\\"\\\\\\\"\\\",\\\"39\\\":\\\"a\\\",\\\"40\\\":\\\"\\\\\\\"\\\",\\\"41\\\":\\\",\\\",\\\"42\\\":\\\"\\\\\\\"\\\",\\\"43\\\":\\\"5\\\",\\\"44\\\":\\\"\\\\\\\"\\\",\\\"45\\\":\\\":\\\",\\\"46\\\":\\\"\\\\\\\"\\\",\\\"47\\\":\\\"n\\\",\\\"48\\\":\\\"\\\\\\\"\\\",\\\"49\\\":\\\",\\\",\\\"50\\\":\\\"\\\\\\\"\\\",\\\"51\\\":\\\"6\\\",\\\"52\\\":\\\"\\\\\\\"\\\",\\\"53\\\":\\\":\\\",\\\"54\\\":\\\"\\\\\\\"\\\",\\\"55\\\":\\\"_\\\",\\\"56\\\":\\\"\\\\\\\"\\\",\\\"57\\\":\\\",\\\",\\\"58\\\":\\\"\\\\\\\"\\\",\\\"59\\\":\\\"7\\\",\\\"60\\\":\\\"\\\\\\\"\\\",\\\"61\\\":\\\":\\\",\\\"62\\\":\\\"\\\\\\\"\\\",\\\"63\\\":\\\"n\\\",\\\"64\\\":\\\"\\\\\\\"\\\",\\\"65\\\":\\\",\\\",\\\"66\\\":\\\"\\\\\\\"\\\",\\\"67\\\":\\\"8\\\",\\\"68\\\":\\\"\\\\\\\"\\\",\\\"69\\\":\\\":\\\",\\\"70\\\":\\\"\\\\\\\"\\\",\\\"71\\\":\\\"a\\\",\\\"72\\\":\\\"\\\\\\\"\\\",\\\"73\\\":\\\",\\\",\\\"74\\\":\\\"\\\\\\\"\\\",\\\"75\\\":\\\"9\\\",\\\"76\\\":\\\"\\\\\\\"\\\",\\\"77\\\":\\\":\\\",\\\"78\\\":\\\"\\\\\\\"\\\",\\\"79\\\":\\\"m\\\",\\\"80\\\":\\\"\\\\\\\"\\\",\\\"81\\\":\\\",\\\",\\\"82\\\":\\\"\\\\\\\"\\\",\\\"83\\\":\\\"1\\\",\\\"84\\\":\\\"0\\\",\\\"85\\\":\\\"\\\\\\\"\\\",\\\"86\\\":\\\":\\\",\\\"87\\\":\\\"\\\\\\\"\\\",\\\"88\\\":\\\"e\\\",\\\"89\\\":\\\"\\\\\\\"\\\",\\\"90\\\":\\\",\\\",\\\"91\\\":\\\"\\\\\\\"\\\",\\\"92\\\":\\\"1\\\",\\\"93\\\":\\\"1\\\",\\\"94\\\":\\\"\\\\\\\"\\\",\\\"95\\\":\\\":\\\",\\\"96\\\":\\\"\\\\\\\"\\\",\\\"97\\\":\\\"\\\\\\\\\\\",\\\"98\\\":\\\"\\\\\\\"\\\",\\\"99\\\":\\\"\\\\\\\"\\\",\\\"100\\\":\\\",\\\",\\\"101\\\":\\\"\\\\\\\"\\\",\\\"102\\\":\\\"1\\\",\\\"103\\\":\\\"2\\\",\\\"104\\\":\\\"\\\\\\\"\\\",\\\"105\\\":\\\":\\\",\\\"106\\\":\\\"\\\\\\\"\\\",\\\"107\\\":\\\":\\\",\\\"108\\\":\\\"\\\\\\\"\\\",\\\"109\\\":\\\",\\\",\\\"110\\\":\\\"\\\\\\\"\\\",\\\"111\\\":\\\"1\\\",\\\"112\\\":\\\"3\\\",\\\"113\\\":\\\"\\\\\\\"\\\",\\\"114\\\":\\\":\\\",\\\"115\\\":\\\"\\\\\\\"\\\",\\\"116\\\":\\\"\\\\\\\\\\\",\\\"117\\\":\\\"\\\\\\\"\\\",\\\"118\\\":\\\"\\\\\\\"\\\",\\\"119\\\":\\\",\\\",\\\"120\\\":\\\"\\\\\\\"\\\",\\\"121\\\":\\\"1\\\",\\\"122\\\":\\\"4\\\",\\\"123\\\":\\\"\\\\\\\"\\\",\\\"124\\\":\\\":\\\",\\\"125\\\":\\\"\\\\\\\"\\\",\\\"126\\\":\\\"S\\\",\\\"127\\\":\\\"\\\\\\\"\\\",\\\"128\\\":\\\",\\\",\\\"129\\\":\\\"\\\\\\\"\\\",\\\"130\\\":\\\"1\\\",\\\"131\\\":\\\"5\\\",\\\"132\\\":\\\"\\\\\\\"\\\",\\\"133\\\":\\\":\\\",\\\"134\\\":\\\"\\\\\\\"\\\",\\\"135\\\":\\\"t\\\",\\\"136\\\":\\\"\\\\\\\"\\\",\\\"137\\\":\\\",\\\",\\\"138\\\":\\\"\\\\\\\"\\\",\\\"139\\\":\\\"1\\\",\\\"140\\\":\\\"6\\\",\\\"141\\\":\\\"\\\\\\\"\\\",\\\"142\\\":\\\":\\\",\\\"143\\\":\\\"\\\\\\\"\\\",\\\"144\\\":\\\"a\\\",\\\"145\\\":\\\"\\\\\\\"\\\",\\\"146\\\":\\\",\\\",\\\"147\\\":\\\"\\\\\\\"\\\",\\\"148\\\":\\\"1\\\",\\\"149\\\":\\\"7\\\",\\\"150\\\":\\\"\\\\\\\"\\\",\\\"151\\\":\\\":\\\",\\\"152\\\":\\\"\\\\\\\"\\\",\\\"153\\\":\\\"n\\\",\\\"154\\\":\\\"\\\\\\\"\\\",\\\"155\\\":\\\",\\\",\\\"156\\\":\\\"\\\\\\\"\\\",\\\"157\\\":\\\"1\\\",\\\"158\\\":\\\"8\\\",\\\"159\\\":\\\"\\\\\\\"\\\",\\\"160\\\":\\\":\\\",\\\"161\\\":\\\"\\\\\\\"\\\",\\\"162\\\":\\\"d\\\",\\\"163\\\":\\\"\\\\\\\"\\\",\\\"164\\\":\\\",\\\",\\\"165\\\":\\\"\\\\\\\"\\\",\\\"166\\\":\\\"1\\\",\\\"167\\\":\\\"9\\\",\\\"168\\\":\\\"\\\\\\\"\\\",\\\"169\\\":\\\":\\\",\\\"170\\\":\\\"\\\\\\\"\\\",\\\"171\\\":\\\"a\\\",\\\"172\\\":\\\"\\\\\\\"\\\",\\\"173\\\":\\\",\\\",\\\"174\\\":\\\"\\\\\\\"\\\",\\\"175\\\":\\\"2\\\",\\\"176\\\":\\\"0\\\",\\\"177\\\":\\\"\\\\\\\"\\\",\\\"178\\\":\\\":\\\",\\\"179\\\":\\\"\\\\\\\"\\\",\\\"180\\\":\\\"r\\\",\\\"181\\\":\\\"\\\\\\\"\\\",\\\"182\\\":\\\",\\\",\\\"183\\\":\\\"\\\\\\\"\\\",\\\"184\\\":\\\"2\\\",\\\"185\\\":\\\"1\\\",\\\"186\\\":\\\"\\\\\\\"\\\",\\\"187\\\":\\\":\\\",\\\"188\\\":\\\"\\\\\\\"\\\",\\\"189\\\":\\\"d\\\",\\\"190\\\":\\\"\\\\\\\"\\\",\\\"191\\\":\\\",\\\",\\\"192\\\":\\\"\\\\\\\"\\\",\\\"193\\\":\\\"2\\\",\\\"194\\\":\\\"2\\\",\\\"195\\\":\\\"\\\\\\\"\\\",\\\"196\\\":\\\":\\\",\\\"197\\\":\\\"\\\\\\\"\\\",\\\"198\\\":\\\" \\\",\\\"199\\\":\\\"\\\\\\\"\\\",\\\"200\\\":\\\",\\\",\\\"201\\\":\\\"\\\\\\\"\\\",\\\"202\\\":\\\"2\\\",\\\"203\\\":\\\"3\\\",\\\"204\\\":\\\"\\\\\\\"\\\",\\\"205\\\":\\\":\\\",\\\"206\\\":\\\"\\\\\\\"\\\",\\\"207\\\":\\\"-\\\",\\\"208\\\":\\\"\\\\\\\"\\\",\\\"209\\\":\\\",\\\",\\\"210\\\":\\\"\\\\\\\"\\\",\\\"211\\\":\\\"2\\\",\\\"212\\\":\\\"4\\\",\\\"213\\\":\\\"\\\\\\\"\\\",\\\"214\\\":\\\":\\\",\\\"215\\\":\\\"\\\\\\\"\\\",\\\"216\\\":\\\" \\\",\\\"217\\\":\\\"\\\\\\\"\\\",\\\"218\\\":\\\",\\\",\\\"219\\\":\\\"\\\\\\\"\\\",\\\"220\\\":\\\"2\\\",\\\"221\\\":\\\"5\\\",\\\"222\\\":\\\"\\\\\\\"\\\",\\\"223\\\":\\\":\\\",\\\"224\\\":\\\"\\\\\\\"\\\",\\\"225\\\":\\\"3\\\",\\\"226\\\":\\\"\\\\\\\"\\\",\\\"227\\\":\\\",\\\",\\\"228\\\":\\\"\\\\\\\"\\\",\\\"229\\\":\\\"2\\\",\\\"230\\\":\\\"6\\\",\\\"231\\\":\\\"\\\\\\\"\\\",\\\"232\\\":\\\":\\\",\\\"233\\\":\\\"\\\\\\\"\\\",\\\"234\\\":\\\"0\\\",\\\"235\\\":\\\"\\\\\\\"\\\",\\\"236\\\":\\\",\\\",\\\"237\\\":\\\"\\\\\\\"\\\",\\\"238\\\":\\\"2\\\",\\\"239\\\":\\\"7\\\",\\\"240\\\":\\\"\\\\\\\"\\\",\\\"241\\\":\\\":\\\",\\\"242\\\":\\\"\\\\\\\"\\\",\\\"243\\\":\\\" \\\",\\\"244\\\":\\\"\\\\\\\"\\\",\\\"245\\\":\\\",\\\",\\\"246\\\":\\\"\\\\\\\"\\\",\\\"247\\\":\\\"2\\\",\\\"248\\\":\\\"8\\\",\\\"249\\\":\\\"\\\\\\\"\\\",\\\"250\\\":\\\":\\\",\\\"251\\\":\\\"\\\\\\\"\\\",\\\"252\\\":\\\"D\\\",\\\"253\\\":\\\"\\\\\\\"\\\",\\\"254\\\":\\\",\\\",\\\"255\\\":\\\"\\\\\\\"\\\",\\\"256\\\":\\\"2\\\",\\\"257\\\":\\\"9\\\",\\\"258\\\":\\\"\\\\\\\"\\\",\\\"259\\\":\\\":\\\",\\\"260\\\":\\\"\\\\\\\"\\\",\\\"261\\\":\\\"a\\\",\\\"262\\\":\\\"\\\\\\\"\\\",\\\"263\\\":\\\",\\\",\\\"264\\\":\\\"\\\\\\\"\\\",\\\"265\\\":\\\"3\\\",\\\"266\\\":\\\"0\\\",\\\"267\\\":\\\"\\\\\\\"\\\",\\\"268\\\":\\\":\\\",\\\"269\\\":\\\"\\\\\\\"\\\",\\\"270\\\":\\\"y\\\",\\\"271\\\":\\\"\\\\\\\"\\\",\\\"272\\\":\\\",\\\",\\\"273\\\":\\\"\\\\\\\"\\\",\\\"274\\\":\\\"3\\\",\\\"275\\\":\\\"1\\\",\\\"276\\\":\\\"\\\\\\\"\\\",\\\"277\\\":\\\":\\\",\\\"278\\\":\\\"\\\\\\\"\\\",\\\"279\\\":\\\"s\\\",\\\"280\\\":\\\"\\\\\\\"\\\",\\\"281\\\":\\\",\\\",\\\"282\\\":\\\"\\\\\\\"\\\",\\\"283\\\":\\\"3\\\",\\\"284\\\":\\\"2\\\",\\\"285\\\":\\\"\\\\\\\"\\\",\\\"286\\\":\\\":\\\",\\\"287\\\":\\\"\\\\\\\"\\\",\\\"288\\\":\\\"\\\\\\\\\\\",\\\"289\\\":\\\"\\\\\\\"\\\",\\\"290\\\":\\\"\\\\\\\"\\\",\\\"291\\\":\\\",\\\",\\\"292\\\":\\\"\\\\\\\"\\\",\\\"293\\\":\\\"3\\\",\\\"294\\\":\\\"3\\\",\\\"295\\\":\\\"\\\\\\\"\\\",\\\"296\\\":\\\":\\\",\\\"297\\\":\\\"\\\\\\\"\\\",\\\"298\\\":\\\",\\\",\\\"299\\\":\\\"\\\\\\\"\\\",\\\"300\\\":\\\",\\\",\\\"301\\\":\\\"\\\\\\\"\\\",\\\"302\\\":\\\"3\\\",\\\"303\\\":\\\"4\\\",\\\"304\\\":\\\"\\\\\\\"\\\",\\\"305\\\":\\\":\\\",\\\"306\\\":\\\"\\\\\\\"\\\",\\\"307\\\":\\\"\\\\\\\\\\\",\\\"308\\\":\\\"\\\\\\\"\\\",\\\"309\\\":\\\"\\\\\\\"\\\",\\\"310\\\":\\\",\\\",\\\"311\\\":\\\"\\\\\\\"\\\",\\\"312\\\":\\\"3\\\",\\\"313\\\":\\\"5\\\",\\\"314\\\":\\\"\\\\\\\"\\\",\\\"315\\\":\\\":\\\",\\\"316\\\":\\\"\\\\\\\"\\\",\\\"317\\\":\\\"p\\\",\\\"318\\\":\\\"\\\\\\\"\\\",\\\"319\\\":\\\",\\\",\\\"320\\\":\\\"\\\\\\\"\\\",\\\"321\\\":\\\"3\\\",\\\"322\\\":\\\"6\\\",\\\"323\\\":\\\"\\\\\\\"\\\",\\\"324\\\":\\\":\\\",\\\"325\\\":\\\"\\\\\\\"\\\",\\\"326\\\":\\\"l\\\",\\\"327\\\":\\\"\\\\\\\"\\\",\\\"328\\\":\\\",\\\",\\\"329\\\":\\\"\\\\\\\"\\\",\\\"330\\\":\\\"3\\\",\\\"331\\\":\\\"7\\\",\\\"332\\\":\\\"\\\\\\\"\\\",\\\"333\\\":\\\":\\\",\\\"334\\\":\\\"\\\\\\\"\\\",\\\"335\\\":\\\"a\\\",\\\"336\\\":\\\"\\\\\\\"\\\",\\\"337\\\":\\\",\\\",\\\"338\\\":\\\"\\\\\\\"\\\",\\\"339\\\":\\\"3\\\",\\\"340\\\":\\\"8\\\",\\\"341\\\":\\\"\\\\\\\"\\\",\\\"342\\\":\\\":\\\",\\\"343\\\":\\\"\\\\\\\"\\\",\\\"344\\\":\\\"n\\\",\\\"345\\\":\\\"\\\\\\\"\\\",\\\"346\\\":\\\",\\\",\\\"347\\\":\\\"\\\\\\\"\\\",\\\"348\\\":\\\"3\\\",\\\"349\\\":\\\"9\\\",\\\"350\\\":\\\"\\\\\\\"\\\",\\\"351\\\":\\\":\\\",\\\"352\\\":\\\"\\\\\\\"\\\",\\\"353\\\":\\\"_\\\",\\\"354\\\":\\\"\\\\\\\"\\\",\\\"355\\\":\\\",\\\",\\\"356\\\":\\\"\\\\\\\"\\\",\\\"357\\\":\\\"4\\\",\\\"358\\\":\\\"0\\\",\\\"359\\\":\\\"\\\\\\\"\\\",\\\"360\\\":\\\":\\\",\\\"361\\\":\\\"\\\\\\\"\\\",\\\"362\\\":\\\"d\\\",\\\"363\\\":\\\"\\\\\\\"\\\",\\\"364\\\":\\\",\\\",\\\"365\\\":\\\"\\\\\\\"\\\",\\\"366\\\":\\\"4\\\",\\\"367\\\":\\\"1\\\",\\\"368\\\":\\\"\\\\\\\"\\\",\\\"369\\\":\\\":\\\",\\\"370\\\":\\\"\\\\\\\"\\\",\\\"371\\\":\\\"e\\\",\\\"372\\\":\\\"\\\\\\\"\\\",\\\"373\\\":\\\",\\\",\\\"374\\\":\\\"\\\\\\\"\\\",\\\"375\\\":\\\"4\\\",\\\"376\\\":\\\"2\\\",\\\"377\\\":\\\"\\\\\\\"\\\",\\\"378\\\":\\\":\\\",\\\"379\\\":\\\"\\\\\\\"\\\",\\\"380\\\":\\\"s\\\",\\\"381\\\":\\\"\\\\\\\"\\\",\\\"382\\\":\\\",\\\",\\\"383\\\":\\\"\\\\\\\"\\\",\\\"384\\\":\\\"4\\\",\\\"385\\\":\\\"3\\\",\\\"386\\\":\\\"\\\\\\\"\\\",\\\"387\\\":\\\":\\\",\\\"388\\\":\\\"\\\\\\\"\\\",\\\"389\\\":\\\"c\\\",\\\"390\\\":\\\"\\\\\\\"\\\",\\\"391\\\":\\\",\\\",\\\"392\\\":\\\"\\\\\\\"\\\",\\\"393\\\":\\\"4\\\",\\\"394\\\":\\\"4\\\",\\\"395\\\":\\\"\\\\\\\"\\\",\\\"396\\\":\\\":\\\",\\\"397\\\":\\\"\\\\\\\"\\\",\\\"398\\\":\\\"r\\\",\\\"399\\\":\\\"\\\\\\\"\\\",\\\"400\\\":\\\",\\\",\\\"401\\\":\\\"\\\\\\\"\\\",\\\"402\\\":\\\"4\\\",\\\"403\\\":\\\"5\\\",\\\"404\\\":\\\"\\\\\\\"\\\",\\\"405\\\":\\\":\\\",\\\"406\\\":\\\"\\\\\\\"\\\",\\\"407\\\":\\\"i\\\",\\\"408\\\":\\\"\\\\\\\"\\\",\\\"409\\\":\\\",\\\",\\\"410\\\":\\\"\\\\\\\"\\\",\\\"411\\\":\\\"4\\\",\\\"412\\\":\\\"6\\\",\\\"413\\\":\\\"\\\\\\\"\\\",\\\"414\\\":\\\":\\\",\\\"415\\\":\\\"\\\\\\\"\\\",\\\"416\\\":\\\"p\\\",\\\"417\\\":\\\"\\\\\\\"\\\",\\\"418\\\":\\\",\\\",\\\"419\\\":\\\"\\\\\\\"\\\",\\\"420\\\":\\\"4\\\",\\\"421\\\":\\\"7\\\",\\\"422\\\":\\\"\\\\\\\"\\\",\\\"423\\\":\\\":\\\",\\\"424\\\":\\\"\\\\\\\"\\\",\\\"425\\\":\\\"t\\\",\\\"426\\\":\\\"\\\\\\\"\\\",\\\"427\\\":\\\",\\\",\\\"428\\\":\\\"\\\\\\\"\\\",\\\"429\\\":\\\"4\\\",\\\"430\\\":\\\"8\\\",\\\"431\\\":\\\"\\\\\\\"\\\",\\\"432\\\":\\\":\\\",\\\"433\\\":\\\"\\\\\\\"\\\",\\\"434\\\":\\\"i\\\",\\\"435\\\":\\\"\\\\\\\"\\\",\\\"436\\\":\\\",\\\",\\\"437\\\":\\\"\\\\\\\"\\\",\\\"438\\\":\\\"4\\\",\\\"439\\\":\\\"9\\\",\\\"440\\\":\\\"\\\\\\\"\\\",\\\"441\\\":\\\":\\\",\\\"442\\\":\\\"\\\\\\\"\\\",\\\"443\\\":\\\"o\\\",\\\"444\\\":\\\"\\\\\\\"\\\",\\\"445\\\":\\\",\\\",\\\"446\\\":\\\"\\\\\\\"\\\",\\\"447\\\":\\\"5\\\",\\\"448\\\":\\\"0\\\",\\\"449\\\":\\\"\\\\\\\"\\\",\\\"450\\\":\\\":\\\",\\\"451\\\":\\\"\\\\\\\"\\\",\\\"452\\\":\\\"n\\\",\\\"453\\\":\\\"\\\\\\\"\\\",\\\"454\\\":\\\",\\\",\\\"455\\\":\\\"\\\\\\\"\\\",\\\"456\\\":\\\"5\\\",\\\"457\\\":\\\"1\\\",\\\"458\\\":\\\"\\\\\\\"\\\",\\\"459\\\":\\\":\\\",\\\"460\\\":\\\"\\\\\\\"\\\",\\\"461\\\":\\\"\\\\\\\\\\\",\\\"462\\\":\\\"\\\\\\\"\\\",\\\"463\\\":\\\"\\\\\\\"\\\",\\\"464\\\":\\\",\\\",\\\"465\\\":\\\"\\\\\\\"\\\",\\\"466\\\":\\\"5\\\",\\\"467\\\":\\\"2\\\",\\\"468\\\":\\\"\\\\\\\"\\\",\\\"469\\\":\\\":\\\",\\\"470\\\":\\\"\\\\\\\"\\\",\\\"471\\\":\\\":\\\",\\\"472\\\":\\\"\\\\\\\"\\\",\\\"473\\\":\\\",\\\",\\\"474\\\":\\\"\\\\\\\"\\\",\\\"475\\\":\\\"5\\\",\\\"476\\\":\\\"3\\\",\\\"477\\\":\\\"\\\\\\\"\\\",\\\"478\\\":\\\":\\\",\\\"479\\\":\\\"\\\\\\\"\\\",\\\"480\\\":\\\"\\\\\\\\\\\",\\\"481\\\":\\\"\\\\\\\"\\\",\\\"482\\\":\\\"\\\\\\\"\\\",\\\"483\\\":\\\",\\\",\\\"484\\\":\\\"\\\\\\\"\\\",\\\"485\\\":\\\"5\\\",\\\"486\\\":\\\"4\\\",\\\"487\\\":\\\"\\\\\\\"\\\",\\\"488\\\":\\\":\\\",\\\"489\\\":\\\"\\\\\\\"\\\",\\\"490\\\":\\\"Z\\\",\\\"491\\\":\\\"\\\\\\\"\\\",\\\"492\\\":\\\",\\\",\\\"493\\\":\\\"\\\\\\\"\\\",\\\"494\\\":\\\"5\\\",\\\"495\\\":\\\"5\\\",\\\"496\\\":\\\"\\\\\\\"\\\",\\\"497\\\":\\\":\\\",\\\"498\\\":\\\"\\\\\\\"\\\",\\\"499\\\":\\\"e\\\",\\\"500\\\":\\\"\\\\\\\"\\\",\\\"501\\\":\\\",\\\",\\\"502\\\":\\\"\\\\\\\"\\\",\\\"503\\\":\\\"5\\\",\\\"504\\\":\\\"6\\\",\\\"505\\\":\\\"\\\\\\\"\\\",\\\"506\\\":\\\":\\\",\\\"507\\\":\\\"\\\\\\\"\\\",\\\"508\\\":\\\"r\\\",\\\"509\\\":\\\"\\\\\\\"\\\",\\\"510\\\":\\\",\\\",\\\"511\\\":\\\"\\\\\\\"\\\",\\\"512\\\":\\\"5\\\",\\\"513\\\":\\\"7\\\",\\\"514\\\":\\\"\\\\\\\"\\\",\\\"515\\\":\\\":\\\",\\\"516\\\":\\\"\\\\\\\"\\\",\\\"517\\\":\\\"o\\\",\\\"518\\\":\\\"\\\\\\\"\\\",\\\"519\\\":\\\",\\\",\\\"520\\\":\\\"\\\\\\\"\\\",\\\"521\\\":\\\"5\\\",\\\"522\\\":\\\"8\\\",\\\"523\\\":\\\"\\\\\\\"\\\",\\\"524\\\":\\\":\\\",\\\"525\\\":\\\"\\\\\\\"\\\",\\\"526\\\":\\\" \\\",\\\"527\\\":\\\"\\\\\\\"\\\",\\\"528\\\":\\\",\\\",\\\"529\\\":\\\"\\\\\\\"\\\",\\\"530\\\":\\\"5\\\",\\\"531\\\":\\\"9\\\",\\\"532\\\":\\\"\\\\\\\"\\\",\\\"533\\\":\\\":\\\",\\\"534\\\":\\\"\\\\\\\"\\\",\\\"535\\\":\\\"c\\\",\\\"536\\\":\\\"\\\\\\\"\\\",\\\"537\\\":\\\",\\\",\\\"538\\\":\\\"\\\\\\\"\\\",\\\"539\\\":\\\"6\\\",\\\"540\\\":\\\"0\\\",\\\"541\\\":\\\"\\\\\\\"\\\",\\\"542\\\":\\\":\\\",\\\"543\\\":\\\"\\\\\\\"\\\",\\\"544\\\":\\\"o\\\",\\\"545\\\":\\\"\\\\\\\"\\\",\\\"546\\\":\\\",\\\",\\\"547\\\":\\\"\\\\\\\"\\\",\\\"548\\\":\\\"6\\\",\\\"549\\\":\\\"1\\\",\\\"550\\\":\\\"\\\\\\\"\\\",\\\"551\\\":\\\":\\\",\\\"552\\\":\\\"\\\\\\\"\\\",\\\"553\\\":\\\"m\\\",\\\"554\\\":\\\"\\\\\\\"\\\",\\\"555\\\":\\\",\\\",\\\"556\\\":\\\"\\\\\\\"\\\",\\\"557\\\":\\\"6\\\",\\\"558\\\":\\\"2\\\",\\\"559\\\":\\\"\\\\\\\"\\\",\\\"560\\\":\\\":\\\",\\\"561\\\":\\\"\\\\\\\"\\\",\\\"562\\\":\\\"m\\\",\\\"563\\\":\\\"\\\\\\\"\\\",\\\"564\\\":\\\",\\\",\\\"565\\\":\\\"\\\\\\\"\\\",\\\"566\\\":\\\"6\\\",\\\"567\\\":\\\"3\\\",\\\"568\\\":\\\"\\\\\\\"\\\",\\\"569\\\":\\\":\\\",\\\"570\\\":\\\"\\\\\\\"\\\",\\\"571\\\":\\\"i\\\",\\\"572\\\":\\\"\\\\\\\"\\\",\\\"573\\\":\\\",\\\",\\\"574\\\":\\\"\\\\\\\"\\\",\\\"575\\\":\\\"6\\\",\\\"576\\\":\\\"4\\\",\\\"577\\\":\\\"\\\\\\\"\\\",\\\"578\\\":\\\":\\\",\\\"579\\\":\\\"\\\\\\\"\\\",\\\"580\\\":\\\"s\\\",\\\"581\\\":\\\"\\\\\\\"\\\",\\\"582\\\":\\\",\\\",\\\"583\\\":\\\"\\\\\\\"\\\",\\\"584\\\":\\\"6\\\",\\\"585\\\":\\\"5\\\",\\\"586\\\":\\\"\\\\\\\"\\\",\\\"587\\\":\\\":\\\",\\\"588\\\":\\\"\\\\\\\"\\\",\\\"589\\\":\\\"s\\\",\\\"590\\\":\\\"\\\\\\\"\\\",\\\"591\\\":\\\",\\\",\\\"592\\\":\\\"\\\\\\\"\\\",\\\"593\\\":\\\"6\\\",\\\"594\\\":\\\"6\\\",\\\"595\\\":\\\"\\\\\\\"\\\",\\\"596\\\":\\\":\\\",\\\"597\\\":\\\"\\\\\\\"\\\",\\\"598\\\":\\\"i\\\",\\\"599\\\":\\\"\\\\\\\"\\\",\\\"600\\\":\\\",\\\",\\\"601\\\":\\\"\\\\\\\"\\\",\\\"602\\\":\\\"6\\\",\\\"603\\\":\\\"7\\\",\\\"604\\\":\\\"\\\\\\\"\\\",\\\"605\\\":\\\":\\\",\\\"606\\\":\\\"\\\\\\\"\\\",\\\"607\\\":\\\"o\\\",\\\"608\\\":\\\"\\\\\\\"\\\",\\\"609\\\":\\\",\\\",\\\"610\\\":\\\"\\\\\\\"\\\",\\\"611\\\":\\\"6\\\",\\\"612\\\":\\\"8\\\",\\\"613\\\":\\\"\\\\\\\"\\\",\\\"614\\\":\\\":\\\",\\\"615\\\":\\\"\\\\\\\"\\\",\\\"616\\\":\\\"n\\\",\\\"617\\\":\\\"\\\\\\\"\\\",\\\"618\\\":\\\",\\\",\\\"619\\\":\\\"\\\\\\\"\\\",\\\"620\\\":\\\"6\\\",\\\"621\\\":\\\"9\\\",\\\"622\\\":\\\"\\\\\\\"\\\",\\\"623\\\":\\\":\\\",\\\"624\\\":\\\"\\\\\\\"\\\",\\\"625\\\":\\\" \\\",\\\"626\\\":\\\"\\\\\\\"\\\",\\\"627\\\":\\\",\\\",\\\"628\\\":\\\"\\\\\\\"\\\",\\\"629\\\":\\\"7\\\",\\\"630\\\":\\\"0\\\",\\\"631\\\":\\\"\\\\\\\"\\\",\\\"632\\\":\\\":\\\",\\\"633\\\":\\\"\\\\\\\"\\\",\\\"634\\\":\\\"f\\\",\\\"635\\\":\\\"\\\\\\\"\\\",\\\"636\\\":\\\",\\\",\\\"637\\\":\\\"\\\\\\\"\\\",\\\"638\\\":\\\"7\\\",\\\"639\\\":\\\"1\\\",\\\"640\\\":\\\"\\\\\\\"\\\",\\\"641\\\":\\\":\\\",\\\"642\\\":\\\"\\\\\\\"\\\",\\\"643\\\":\\\"o\\\",\\\"644\\\":\\\"\\\\\\\"\\\",\\\"645\\\":\\\",\\\",\\\"646\\\":\\\"\\\\\\\"\\\",\\\"647\\\":\\\"7\\\",\\\"648\\\":\\\"2\\\",\\\"649\\\":\\\"\\\\\\\"\\\",\\\"650\\\":\\\":\\\",\\\"651\\\":\\\"\\\\\\\"\\\",\\\"652\\\":\\\"r\\\",\\\"653\\\":\\\"\\\\\\\"\\\",\\\"654\\\":\\\",\\\",\\\"655\\\":\\\"\\\\\\\"\\\",\\\"656\\\":\\\"7\\\",\\\"657\\\":\\\"3\\\",\\\"658\\\":\\\"\\\\\\\"\\\",\\\"659\\\":\\\":\\\",\\\"660\\\":\\\"\\\\\\\"\\\",\\\"661\\\":\\\" \\\",\\\"662\\\":\\\"\\\\\\\"\\\",\\\"663\\\":\\\",\\\",\\\"664\\\":\\\"\\\\\\\"\\\",\\\"665\\\":\\\"7\\\",\\\"666\\\":\\\"4\\\",\\\"667\\\":\\\"\\\\\\\"\\\",\\\"668\\\":\\\":\\\",\\\"669\\\":\\\"\\\\\\\"\\\",\\\"670\\\":\\\"3\\\",\\\"671\\\":\\\"\\\\\\\"\\\",\\\"672\\\":\\\",\\\",\\\"673\\\":\\\"\\\\\\\"\\\",\\\"674\\\":\\\"7\\\",\\\"675\\\":\\\"5\\\",\\\"676\\\":\\\"\\\\\\\"\\\",\\\"677\\\":\\\":\\\",\\\"678\\\":\\\"\\\\\\\"\\\",\\\"679\\\":\\\"0\\\",\\\"680\\\":\\\"\\\\\\\"\\\",\\\"681\\\":\\\",\\\",\\\"682\\\":\\\"\\\\\\\"\\\",\\\"683\\\":\\\"7\\\",\\\"684\\\":\\\"6\\\",\\\"685\\\":\\\"\\\\\\\"\\\",\\\"686\\\":\\\":\\\",\\\"687\\\":\\\"\\\\\\\"\\\",\\\"688\\\":\\\" \\\",\\\"689\\\":\\\"\\\\\\\"\\\",\\\"690\\\":\\\",\\\",\\\"691\\\":\\\"\\\\\\\"\\\",\\\"692\\\":\\\"7\\\",\\\"693\\\":\\\"7\\\",\\\"694\\\":\\\"\\\\\\\"\\\",\\\"695\\\":\\\":\\\",\\\"696\\\":\\\"\\\\\\\"\\\",\\\"697\\\":\\\"d\\\",\\\"698\\\":\\\"\\\\\\\"\\\",\\\"699\\\":\\\",\\\",\\\"700\\\":\\\"\\\\\\\"\\\",\\\"701\\\":\\\"7\\\",\\\"702\\\":\\\"8\\\",\\\"703\\\":\\\"\\\\\\\"\\\",\\\"704\\\":\\\":\\\",\\\"705\\\":\\\"\\\\\\\"\\\",\\\"706\\\":\\\"a\\\",\\\"707\\\":\\\"\\\\\\\"\\\",\\\"708\\\":\\\",\\\",\\\"709\\\":\\\"\\\\\\\"\\\",\\\"710\\\":\\\"7\\\",\\\"711\\\":\\\"9\\\",\\\"712\\\":\\\"\\\\\\\"\\\",\\\"713\\\":\\\":\\\",\\\"714\\\":\\\"\\\\\\\"\\\",\\\"715\\\":\\\"y\\\",\\\"716\\\":\\\"\\\\\\\"\\\",\\\"717\\\":\\\",\\\",\\\"718\\\":\\\"\\\\\\\"\\\",\\\"719\\\":\\\"8\\\",\\\"720\\\":\\\"0\\\",\\\"721\\\":\\\"\\\\\\\"\\\",\\\"722\\\":\\\":\\\",\\\"723\\\":\\\"\\\\\\\"\\\",\\\"724\\\":\\\"s\\\",\\\"725\\\":\\\"\\\\\\\"\\\",\\\"726\\\":\\\",\\\",\\\"727\\\":\\\"\\\\\\\"\\\",\\\"728\\\":\\\"8\\\",\\\"729\\\":\\\"1\\\",\\\"730\\\":\\\"\\\\\\\"\\\",\\\"731\\\":\\\":\\\",\\\"732\\\":\\\"\\\\\\\"\\\",\\\"733\\\":\\\"\\\\\\\\\\\",\\\"734\\\":\\\"\\\\\\\"\\\",\\\"735\\\":\\\"\\\\\\\"\\\",\\\"736\\\":\\\",\\\",\\\"737\\\":\\\"\\\\\\\"\\\",\\\"738\\\":\\\"8\\\",\\\"739\\\":\\\"2\\\",\\\"740\\\":\\\"\\\\\\\"\\\",\\\"741\\\":\\\":\\\",\\\"742\\\":\\\"\\\\\\\"\\\",\\\"743\\\":\\\",\\\",\\\"744\\\":\\\"\\\\\\\"\\\",\\\"745\\\":\\\",\\\",\\\"746\\\":\\\"\\\\\\\"\\\",\\\"747\\\":\\\"8\\\",\\\"748\\\":\\\"3\\\",\\\"749\\\":\\\"\\\\\\\"\\\",\\\"750\\\":\\\":\\\",\\\"751\\\":\\\"\\\\\\\"\\\",\\\"752\\\":\\\"\\\\\\\\\\\",\\\"753\\\":\\\"\\\\\\\"\\\",\\\"754\\\":\\\"\\\\\\\"\\\",\\\"755\\\":\\\",\\\",\\\"756\\\":\\\"\\\\\\\"\\\",\\\"757\\\":\\\"8\\\",\\\"758\\\":\\\"4\\\",\\\"759\\\":\\\"\\\\\\\"\\\",\\\"760\\\":\\\":\\\",\\\"761\\\":\\\"\\\\\\\"\\\",\\\"762\\\":\\\"c\\\",\\\"763\\\":\\\"\\\\\\\"\\\",\\\"764\\\":\\\",\\\",\\\"765\\\":\\\"\\\\\\\"\\\",\\\"766\\\":\\\"8\\\",\\\"767\\\":\\\"5\\\",\\\"768\\\":\\\"\\\\\\\"\\\",\\\"769\\\":\\\":\\\",\\\"770\\\":\\\"\\\\\\\"\\\",\\\"771\\\":\\\"o\\\",\\\"772\\\":\\\"\\\\\\\"\\\",\\\"773\\\":\\\",\\\",\\\"774\\\":\\\"\\\\\\\"\\\",\\\"775\\\":\\\"8\\\",\\\"776\\\":\\\"6\\\",\\\"777\\\":\\\"\\\\\\\"\\\",\\\"778\\\":\\\":\\\",\\\"779\\\":\\\"\\\\\\\"\\\",\\\"780\\\":\\\"m\\\",\\\"781\\\":\\\"\\\\\\\"\\\",\\\"782\\\":\\\",\\\",\\\"783\\\":\\\"\\\\\\\"\\\",\\\"784\\\":\\\"8\\\",\\\"785\\\":\\\"7\\\",\\\"786\\\":\\\"\\\\\\\"\\\",\\\"787\\\":\\\":\\\",\\\"788\\\":\\\"\\\\\\\"\\\",\\\"789\\\":\\\"m\\\",\\\"790\\\":\\\"\\\\\\\"\\\",\\\"791\\\":\\\",\\\",\\\"792\\\":\\\"\\\\\\\"\\\",\\\"793\\\":\\\"8\\\",\\\"794\\\":\\\"8\\\",\\\"795\\\":\\\"\\\\\\\"\\\",\\\"796\\\":\\\":\\\",\\\"797\\\":\\\"\\\\\\\"\\\",\\\"798\\\":\\\"i\\\",\\\"799\\\":\\\"\\\\\\\"\\\",\\\"800\\\":\\\",\\\",\\\"801\\\":\\\"\\\\\\\"\\\",\\\"802\\\":\\\"8\\\",\\\"803\\\":\\\"9\\\",\\\"804\\\":\\\"\\\\\\\"\\\",\\\"805\\\":\\\":\\\",\\\"806\\\":\\\"\\\\\\\"\\\",\\\"807\\\":\\\"s\\\",\\\"808\\\":\\\"\\\\\\\"\\\",\\\"809\\\":\\\",\\\",\\\"810\\\":\\\"\\\\\\\"\\\",\\\"811\\\":\\\"9\\\",\\\"812\\\":\\\"0\\\",\\\"813\\\":\\\"\\\\\\\"\\\",\\\"814\\\":\\\":\\\",\\\"815\\\":\\\"\\\\\\\"\\\",\\\"816\\\":\\\"s\\\",\\\"817\\\":\\\"\\\\\\\"\\\",\\\"818\\\":\\\",\\\",\\\"819\\\":\\\"\\\\\\\"\\\",\\\"820\\\":\\\"9\\\",\\\"821\\\":\\\"1\\\",\\\"822\\\":\\\"\\\\\\\"\\\",\\\"823\\\":\\\":\\\",\\\"824\\\":\\\"\\\\\\\"\\\",\\\"825\\\":\\\"i\\\",\\\"826\\\":\\\"\\\\\\\"\\\",\\\"827\\\":\\\",\\\",\\\"828\\\":\\\"\\\\\\\"\\\",\\\"829\\\":\\\"9\\\",\\\"830\\\":\\\"2\\\",\\\"831\\\":\\\"\\\\\\\"\\\",\\\"832\\\":\\\":\\\",\\\"833\\\":\\\"\\\\\\\"\\\",\\\"834\\\":\\\"o\\\",\\\"835\\\":\\\"\\\\\\\"\\\",\\\"836\\\":\\\",\\\",\\\"837\\\":\\\"\\\\\\\"\\\",\\\"838\\\":\\\"9\\\",\\\"839\\\":\\\"3\\\",\\\"840\\\":\\\"\\\\\\\"\\\",\\\"841\\\":\\\":\\\",\\\"842\\\":\\\"\\\\\\\"\\\",\\\"843\\\":\\\"n\\\",\\\"844\\\":\\\"\\\\\\\"\\\",\\\"845\\\":\\\",\\\",\\\"846\\\":\\\"\\\\\\\"\\\",\\\"847\\\":\\\"9\\\",\\\"848\\\":\\\"4\\\",\\\"849\\\":\\\"\\\\\\\"\\\",\\\"850\\\":\\\":\\\",\\\"851\\\":\\\"\\\\\\\"\\\",\\\"852\\\":\\\"_\\\",\\\"853\\\":\\\"\\\\\\\"\\\",\\\"854\\\":\\\",\\\",\\\"855\\\":\\\"\\\\\\\"\\\",\\\"856\\\":\\\"9\\\",\\\"857\\\":\\\"5\\\",\\\"858\\\":\\\"\\\\\\\"\\\",\\\"859\\\":\\\":\\\",\\\"860\\\":\\\"\\\\\\\"\\\",\\\"861\\\":\\\"w\\\",\\\"862\\\":\\\"\\\\\\\"\\\",\\\"863\\\":\\\",\\\",\\\"864\\\":\\\"\\\\\\\"\\\",\\\"865\\\":\\\"9\\\",\\\"866\\\":\\\"6\\\",\\\"867\\\":\\\"\\\\\\\"\\\",\\\"868\\\":\\\":\\\",\\\"869\\\":\\\"\\\\\\\"\\\",\\\"870\\\":\\\"a\\\",\\\"871\\\":\\\"\\\\\\\"\\\",\\\"872\\\":\\\",\\\",\\\"873\\\":\\\"\\\\\\\"\\\",\\\"874\\\":\\\"9\\\",\\\"875\\\":\\\"7\\\",\\\"876\\\":\\\"\\\\\\\"\\\",\\\"877\\\":\\\":\\\",\\\"878\\\":\\\"\\\\\\\"\\\",\\\"879\\\":\\\"i\\\",\\\"880\\\":\\\"\\\\\\\"\\\",\\\"881\\\":\\\",\\\",\\\"882\\\":\\\"\\\\\\\"\\\",\\\"883\\\":\\\"9\\\",\\\"884\\\":\\\"8\\\",\\\"885\\\":\\\"\\\\\\\"\\\",\\\"886\\\":\\\":\\\",\\\"887\\\":\\\"\\\\\\\"\\\",\\\"888\\\":\\\"v\\\",\\\"889\\\":\\\"\\\\\\\"\\\",\\\"890\\\":\\\",\\\",\\\"891\\\":\\\"\\\\\\\"\\\",\\\"892\\\":\\\"9\\\",\\\"893\\\":\\\"9\\\",\\\"894\\\":\\\"\\\\\\\"\\\",\\\"895\\\":\\\":\\\",\\\"896\\\":\\\"\\\\\\\"\\\",\\\"897\\\":\\\"e\\\",\\\"898\\\":\\\"\\\\\\\"\\\",\\\"899\\\":\\\",\\\",\\\"900\\\":\\\"\\\\\\\"\\\",\\\"901\\\":\\\"1\\\",\\\"902\\\":\\\"0\\\",\\\"903\\\":\\\"0\\\",\\\"904\\\":\\\"\\\\\\\"\\\",\\\"905\\\":\\\":\\\",\\\"906\\\":\\\"\\\\\\\"\\\",\\\"907\\\":\\\"r\\\",\\\"908\\\":\\\"\\\\\\\"\\\",\\\"909\\\":\\\",\\\",\\\"910\\\":\\\"\\\\\\\"\\\",\\\"911\\\":\\\"1\\\",\\\"912\\\":\\\"0\\\",\\\"913\\\":\\\"1\\\",\\\"914\\\":\\\"\\\\\\\"\\\",\\\"915\\\":\\\":\\\",\\\"916\\\":\\\"\\\\\\\"\\\",\\\"917\\\":\\\"\\\\\\\\\\\",\\\"918\\\":\\\"\\\\\\\"\\\",\\\"919\\\":\\\"\\\\\\\"\\\",\\\"920\\\":\\\",\\\",\\\"921\\\":\\\"\\\\\\\"\\\",\\\"922\\\":\\\"1\\\",\\\"923\\\":\\\"0\\\",\\\"924\\\":\\\"2\\\",\\\"925\\\":\\\"\\\\\\\"\\\",\\\"926\\\":\\\":\\\",\\\"927\\\":\\\"\\\\\\\"\\\",\\\"928\\\":\\\":\\\",\\\"929\\\":\\\"\\\\\\\"\\\",\\\"930\\\":\\\",\\\",\\\"931\\\":\\\"\\\\\\\"\\\",\\\"932\\\":\\\"1\\\",\\\"933\\\":\\\"0\\\",\\\"934\\\":\\\"3\\\",\\\"935\\\":\\\"\\\\\\\"\\\",\\\"936\\\":\\\":\\\",\\\"937\\\":\\\"\\\\\\\"\\\",\\\"938\\\":\\\"t\\\",\\\"939\\\":\\\"\\\\\\\"\\\",\\\"940\\\":\\\",\\\",\\\"941\\\":\\\"\\\\\\\"\\\",\\\"942\\\":\\\"1\\\",\\\"943\\\":\\\"0\\\",\\\"944\\\":\\\"4\\\",\\\"945\\\":\\\"\\\\\\\"\\\",\\\"946\\\":\\\":\\\",\\\"947\\\":\\\"\\\\\\\"\\\",\\\"948\\\":\\\"r\\\",\\\"949\\\":\\\"\\\\\\\"\\\",\\\"950\\\":\\\",\\\",\\\"951\\\":\\\"\\\\\\\"\\\",\\\"952\\\":\\\"1\\\",\\\"953\\\":\\\"0\\\",\\\"954\\\":\\\"5\\\",\\\"955\\\":\\\"\\\\\\\"\\\",\\\"956\\\":\\\":\\\",\\\"957\\\":\\\"\\\\\\\"\\\",\\\"958\\\":\\\"u\\\",\\\"959\\\":\\\"\\\\\\\"\\\",\\\"960\\\":\\\",\\\",\\\"961\\\":\\\"\\\\\\\"\\\",\\\"962\\\":\\\"1\\\",\\\"963\\\":\\\"0\\\",\\\"964\\\":\\\"6\\\",\\\"965\\\":\\\"\\\\\\\"\\\",\\\"966\\\":\\\":\\\",\\\"967\\\":\\\"\\\\\\\"\\\",\\\"968\\\":\\\"e\\\",\\\"969\\\":\\\"\\\\\\\"\\\",\\\"970\\\":\\\",\\\",\\\"971\\\":\\\"\\\\\\\"\\\",\\\"972\\\":\\\"1\\\",\\\"973\\\":\\\"0\\\",\\\"974\\\":\\\"7\\\",\\\"975\\\":\\\"\\\\\\\"\\\",\\\"976\\\":\\\":\\\",\\\"977\\\":\\\"\\\\\\\"\\\",\\\"978\\\":\\\",\\\",\\\"979\\\":\\\"\\\\\\\"\\\",\\\"980\\\":\\\",\\\",\\\"981\\\":\\\"\\\\\\\"\\\",\\\"982\\\":\\\"1\\\",\\\"983\\\":\\\"0\\\",\\\"984\\\":\\\"8\\\",\\\"985\\\":\\\"\\\\\\\"\\\",\\\"986\\\":\\\":\\\",\\\"987\\\":\\\"\\\\\\\"\\\",\\\"988\\\":\\\"\\\\\\\\\\\",\\\"989\\\":\\\"\\\\\\\"\\\",\\\"990\\\":\\\"\\\\\\\"\\\",\\\"991\\\":\\\",\\\",\\\"992\\\":\\\"\\\\\\\"\\\",\\\"993\\\":\\\"1\\\",\\\"994\\\":\\\"0\\\",\\\"995\\\":\\\"9\\\",\\\"996\\\":\\\"\\\\\\\"\\\",\\\"997\\\":\\\":\\\",\\\"998\\\":\\\"\\\\\\\"\\\",\\\"999\\\":\\\"m\\\",\\\"1000\\\":\\\"\\\\\\\"\\\",\\\"1001\\\":\\\",\\\",\\\"1002\\\":\\\"\\\\\\\"\\\",\\\"1003\\\":\\\"1\\\",\\\"1004\\\":\\\"1\\\",\\\"1005\\\":\\\"0\\\",\\\"1006\\\":\\\"\\\\\\\"\\\",\\\"1007\\\":\\\":\\\",\\\"1008\\\":\\\"\\\\\\\"\\\",\\\"1009\\\":\\\"a\\\",\\\"1010\\\":\\\"\\\\\\\"\\\",\\\"1011\\\":\\\",\\\",\\\"1012\\\":\\\"\\\\\\\"\\\",\\\"1013\\\":\\\"1\\\",\\\"1014\\\":\\\"1\\\",\\\"1015\\\":\\\"1\\\",\\\"1016\\\":\\\"\\\\\\\"\\\",\\\"1017\\\":\\\":\\\",\\\"1018\\\":\\\"\\\\\\\"\\\",\\\"1019\\\":\\\"x\\\",\\\"1020\\\":\\\"\\\\\\\"\\\",\\\"1021\\\":\\\",\\\",\\\"1022\\\":\\\"\\\\\\\"\\\",\\\"1023\\\":\\\"1\\\",\\\"1024\\\":\\\"1\\\",\\\"1025\\\":\\\"2\\\",\\\"1026\\\":\\\"\\\\\\\"\\\",\\\"1027\\\":\\\":\\\",\\\"1028\\\":\\\"\\\\\\\"\\\",\\\"1029\\\":\\\"_\\\",\\\"1030\\\":\\\"\\\\\\\"\\\",\\\"1031\\\":\\\",\\\",\\\"1032\\\":\\\"\\\\\\\"\\\",\\\"1033\\\":\\\"1\\\",\\\"1034\\\":\\\"1\\\",\\\"1035\\\":\\\"3\\\",\\\"1036\\\":\\\"\\\\\\\"\\\",\\\"1037\\\":\\\":\\\",\\\"1038\\\":\\\"\\\\\\\"\\\",\\\"1039\\\":\\\"d\\\",\\\"1040\\\":\\\"\\\\\\\"\\\",\\\"1041\\\":\\\",\\\",\\\"1042\\\":\\\"\\\\\\\"\\\",\\\"1043\\\":\\\"1\\\",\\\"1044\\\":\\\"1\\\",\\\"1045\\\":\\\"4\\\",\\\"1046\\\":\\\"\\\\\\\"\\\",\\\"1047\\\":\\\":\\\",\\\"1048\\\":\\\"\\\\\\\"\\\",\\\"1049\\\":\\\"a\\\",\\\"1050\\\":\\\"\\\\\\\"\\\",\\\"1051\\\":\\\",\\\",\\\"1052\\\":\\\"\\\\\\\"\\\",\\\"1053\\\":\\\"1\\\",\\\"1054\\\":\\\"1\\\",\\\"1055\\\":\\\"5\\\",\\\"1056\\\":\\\"\\\\\\\"\\\",\\\"1057\\\":\\\":\\\",\\\"1058\\\":\\\"\\\\\\\"\\\",\\\"1059\\\":\\\"i\\\",\\\"1060\\\":\\\"\\\\\\\"\\\",\\\"1061\\\":\\\",\\\",\\\"1062\\\":\\\"\\\\\\\"\\\",\\\"1063\\\":\\\"1\\\",\\\"1064\\\":\\\"1\\\",\\\"1065\\\":\\\"6\\\",\\\"1066\\\":\\\"\\\\\\\"\\\",\\\"1067\\\":\\\":\\\",\\\"1068\\\":\\\"\\\\\\\"\\\",\\\"1069\\\":\\\"l\\\",\\\"1070\\\":\\\"\\\\\\\"\\\",\\\"1071\\\":\\\",\\\",\\\"1072\\\":\\\"\\\\\\\"\\\",\\\"1073\\\":\\\"1\\\",\\\"1074\\\":\\\"1\\\",\\\"1075\\\":\\\"7\\\",\\\"1076\\\":\\\"\\\\\\\"\\\",\\\"1077\\\":\\\":\\\",\\\"1078\\\":\\\"\\\\\\\"\\\",\\\"1079\\\":\\\"y\\\",\\\"1080\\\":\\\"\\\\\\\"\\\",\\\"1081\\\":\\\",\\\",\\\"1082\\\":\\\"\\\\\\\"\\\",\\\"1083\\\":\\\"1\\\",\\\"1084\\\":\\\"1\\\",\\\"1085\\\":\\\"8\\\",\\\"1086\\\":\\\"\\\\\\\"\\\",\\\"1087\\\":\\\":\\\",\\\"1088\\\":\\\"\\\\\\\"\\\",\\\"1089\\\":\\\"_\\\",\\\"1090\\\":\\\"\\\\\\\"\\\",\\\"1091\\\":\\\",\\\",\\\"1092\\\":\\\"\\\\\\\"\\\",\\\"1093\\\":\\\"1\\\",\\\"1094\\\":\\\"1\\\",\\\"1095\\\":\\\"9\\\",\\\"1096\\\":\\\"\\\\\\\"\\\",\\\"1097\\\":\\\":\\\",\\\"1098\\\":\\\"\\\\\\\"\\\",\\\"1099\\\":\\\"r\\\",\\\"1100\\\":\\\"\\\\\\\"\\\",\\\"1101\\\":\\\",\\\",\\\"1102\\\":\\\"\\\\\\\"\\\",\\\"1103\\\":\\\"1\\\",\\\"1104\\\":\\\"2\\\",\\\"1105\\\":\\\"0\\\",\\\"1106\\\":\\\"\\\\\\\"\\\",\\\"1107\\\":\\\":\\\",\\\"1108\\\":\\\"\\\\\\\"\\\",\\\"1109\\\":\\\"i\\\",\\\"1110\\\":\\\"\\\\\\\"\\\",\\\"1111\\\":\\\",\\\",\\\"1112\\\":\\\"\\\\\\\"\\\",\\\"1113\\\":\\\"1\\\",\\\"1114\\\":\\\"2\\\",\\\"1115\\\":\\\"1\\\",\\\"1116\\\":\\\"\\\\\\\"\\\",\\\"1117\\\":\\\":\\\",\\\"1118\\\":\\\"\\\\\\\"\\\",\\\"1119\\\":\\\"d\\\",\\\"1120\\\":\\\"\\\\\\\"\\\",\\\"1121\\\":\\\",\\\",\\\"1122\\\":\\\"\\\\\\\"\\\",\\\"1123\\\":\\\"1\\\",\\\"1124\\\":\\\"2\\\",\\\"1125\\\":\\\"2\\\",\\\"1126\\\":\\\"\\\\\\\"\\\",\\\"1127\\\":\\\":\\\",\\\"1128\\\":\\\"\\\\\\\"\\\",\\\"1129\\\":\\\"e\\\",\\\"1130\\\":\\\"\\\\\\\"\\\",\\\"1131\\\":\\\",\\\",\\\"1132\\\":\\\"\\\\\\\"\\\",\\\"1133\\\":\\\"1\\\",\\\"1134\\\":\\\"2\\\",\\\"1135\\\":\\\"3\\\",\\\"1136\\\":\\\"\\\\\\\"\\\",\\\"1137\\\":\\\":\\\",\\\"1138\\\":\\\"\\\\\\\"\\\",\\\"1139\\\":\\\"s\\\",\\\"1140\\\":\\\"\\\\\\\"\\\",\\\"1141\\\":\\\",\\\",\\\"1142\\\":\\\"\\\\\\\"\\\",\\\"1143\\\":\\\"1\\\",\\\"1144\\\":\\\"2\\\",\\\"1145\\\":\\\"4\\\",\\\"1146\\\":\\\"\\\\\\\"\\\",\\\"1147\\\":\\\":\\\",\\\"1148\\\":\\\"\\\\\\\"\\\",\\\"1149\\\":\\\"\\\\\\\\\\\",\\\"1150\\\":\\\"\\\\\\\"\\\",\\\"1151\\\":\\\"\\\\\\\"\\\",\\\"1152\\\":\\\",\\\",\\\"1153\\\":\\\"\\\\\\\"\\\",\\\"1154\\\":\\\"1\\\",\\\"1155\\\":\\\"2\\\",\\\"1156\\\":\\\"5\\\",\\\"1157\\\":\\\"\\\\\\\"\\\",\\\"1158\\\":\\\":\\\",\\\"1159\\\":\\\"\\\\\\\"\\\",\\\"1160\\\":\\\":\\\",\\\"1161\\\":\\\"\\\\\\\"\\\",\\\"1162\\\":\\\",\\\",\\\"1163\\\":\\\"\\\\\\\"\\\",\\\"1164\\\":\\\"1\\\",\\\"1165\\\":\\\"2\\\",\\\"1166\\\":\\\"6\\\",\\\"1167\\\":\\\"\\\\\\\"\\\",\\\"1168\\\":\\\":\\\",\\\"1169\\\":\\\"\\\\\\\"\\\",\\\"1170\\\":\\\"n\\\",\\\"1171\\\":\\\"\\\\\\\"\\\",\\\"1172\\\":\\\",\\\",\\\"1173\\\":\\\"\\\\\\\"\\\",\\\"1174\\\":\\\"1\\\",\\\"1175\\\":\\\"2\\\",\\\"1176\\\":\\\"7\\\",\\\"1177\\\":\\\"\\\\\\\"\\\",\\\"1178\\\":\\\":\\\",\\\"1179\\\":\\\"\\\\\\\"\\\",\\\"1180\\\":\\\"u\\\",\\\"1181\\\":\\\"\\\\\\\"\\\",\\\"1182\\\":\\\",\\\",\\\"1183\\\":\\\"\\\\\\\"\\\",\\\"1184\\\":\\\"1\\\",\\\"1185\\\":\\\"2\\\",\\\"1186\\\":\\\"8\\\",\\\"1187\\\":\\\"\\\\\\\"\\\",\\\"1188\\\":\\\":\\\",\\\"1189\\\":\\\"\\\\\\\"\\\",\\\"1190\\\":\\\"l\\\",\\\"1191\\\":\\\"\\\\\\\"\\\",\\\"1192\\\":\\\",\\\",\\\"1193\\\":\\\"\\\\\\\"\\\",\\\"1194\\\":\\\"1\\\",\\\"1195\\\":\\\"2\\\",\\\"1196\\\":\\\"9\\\",\\\"1197\\\":\\\"\\\\\\\"\\\",\\\"1198\\\":\\\":\\\",\\\"1199\\\":\\\"\\\\\\\"\\\",\\\"1200\\\":\\\"l\\\",\\\"1201\\\":\\\"\\\\\\\"\\\",\\\"1202\\\":\\\",\\\",\\\"1203\\\":\\\"\\\\\\\"\\\",\\\"1204\\\":\\\"1\\\",\\\"1205\\\":\\\"3\\\",\\\"1206\\\":\\\"0\\\",\\\"1207\\\":\\\"\\\\\\\"\\\",\\\"1208\\\":\\\":\\\",\\\"1209\\\":\\\"\\\\\\\"\\\",\\\"1210\\\":\\\",\\\",\\\"1211\\\":\\\"\\\\\\\"\\\",\\\"1212\\\":\\\",\\\",\\\"1213\\\":\\\"\\\\\\\"\\\",\\\"1214\\\":\\\"1\\\",\\\"1215\\\":\\\"3\\\",\\\"1216\\\":\\\"1\\\",\\\"1217\\\":\\\"\\\\\\\"\\\",\\\"1218\\\":\\\":\\\",\\\"1219\\\":\\\"\\\\\\\"\\\",\\\"1220\\\":\\\"\\\\\\\\\\\",\\\"1221\\\":\\\"\\\\\\\"\\\",\\\"1222\\\":\\\"\\\\\\\"\\\",\\\"1223\\\":\\\",\\\",\\\"1224\\\":\\\"\\\\\\\"\\\",\\\"1225\\\":\\\"1\\\",\\\"1226\\\":\\\"3\\\",\\\"1227\\\":\\\"2\\\",\\\"1228\\\":\\\"\\\\\\\"\\\",\\\"1229\\\":\\\":\\\",\\\"1230\\\":\\\"\\\\\\\"\\\",\\\"1231\\\":\\\"i\\\",\\\"1232\\\":\\\"\\\\\\\"\\\",\\\"1233\\\":\\\",\\\",\\\"1234\\\":\\\"\\\\\\\"\\\",\\\"1235\\\":\\\"1\\\",\\\"1236\\\":\\\"3\\\",\\\"1237\\\":\\\"3\\\",\\\"1238\\\":\\\"\\\\\\\"\\\",\\\"1239\\\":\\\":\\\",\\\"1240\\\":\\\"\\\\\\\"\\\",\\\"1241\\\":\\\"n\\\",\\\"1242\\\":\\\"\\\\\\\"\\\",\\\"1243\\\":\\\",\\\",\\\"1244\\\":\\\"\\\\\\\"\\\",\\\"1245\\\":\\\"1\\\",\\\"1246\\\":\\\"3\\\",\\\"1247\\\":\\\"4\\\",\\\"1248\\\":\\\"\\\\\\\"\\\",\\\"1249\\\":\\\":\\\",\\\"1250\\\":\\\"\\\\\\\"\\\",\\\"1251\\\":\\\"i\\\",\\\"1252\\\":\\\"\\\\\\\"\\\",\\\"1253\\\":\\\",\\\",\\\"1254\\\":\\\"\\\\\\\"\\\",\\\"1255\\\":\\\"1\\\",\\\"1256\\\":\\\"3\\\",\\\"1257\\\":\\\"5\\\",\\\"1258\\\":\\\"\\\\\\\"\\\",\\\"1259\\\":\\\":\\\",\\\"1260\\\":\\\"\\\\\\\"\\\",\\\"1261\\\":\\\"t\\\",\\\"1262\\\":\\\"\\\\\\\"\\\",\\\"1263\\\":\\\",\\\",\\\"1264\\\":\\\"\\\\\\\"\\\",\\\"1265\\\":\\\"1\\\",\\\"1266\\\":\\\"3\\\",\\\"1267\\\":\\\"6\\\",\\\"1268\\\":\\\"\\\\\\\"\\\",\\\"1269\\\":\\\":\\\",\\\"1270\\\":\\\"\\\\\\\"\\\",\\\"1271\\\":\\\"i\\\",\\\"1272\\\":\\\"\\\\\\\"\\\",\\\"1273\\\":\\\",\\\",\\\"1274\\\":\\\"\\\\\\\"\\\",\\\"1275\\\":\\\"1\\\",\\\"1276\\\":\\\"3\\\",\\\"1277\\\":\\\"7\\\",\\\"1278\\\":\\\"\\\\\\\"\\\",\\\"1279\\\":\\\":\\\",\\\"1280\\\":\\\"\\\\\\\"\\\",\\\"1281\\\":\\\"a\\\",\\\"1282\\\":\\\"\\\\\\\"\\\",\\\"1283\\\":\\\",\\\",\\\"1284\\\":\\\"\\\\\\\"\\\",\\\"1285\\\":\\\"1\\\",\\\"1286\\\":\\\"3\\\",\\\"1287\\\":\\\"8\\\",\\\"1288\\\":\\\"\\\\\\\"\\\",\\\"1289\\\":\\\":\\\",\\\"1290\\\":\\\"\\\\\\\"\\\",\\\"1291\\\":\\\"t\\\",\\\"1292\\\":\\\"\\\\\\\"\\\",\\\"1293\\\":\\\",\\\",\\\"1294\\\":\\\"\\\\\\\"\\\",\\\"1295\\\":\\\"1\\\",\\\"1296\\\":\\\"3\\\",\\\"1297\\\":\\\"9\\\",\\\"1298\\\":\\\"\\\\\\\"\\\",\\\"1299\\\":\\\":\\\",\\\"1300\\\":\\\"\\\\\\\"\\\",\\\"1301\\\":\\\"e\\\",\\\"1302\\\":\\\"\\\\\\\"\\\",\\\"1303\\\":\\\",\\\",\\\"1304\\\":\\\"\\\\\\\"\\\",\\\"1305\\\":\\\"1\\\",\\\"1306\\\":\\\"4\\\",\\\"1307\\\":\\\"0\\\",\\\"1308\\\":\\\"\\\\\\\"\\\",\\\"1309\\\":\\\":\\\",\\\"1310\\\":\\\"\\\\\\\"\\\",\\\"1311\\\":\\\"d\\\",\\\"1312\\\":\\\"\\\\\\\"\\\",\\\"1313\\\":\\\",\\\",\\\"1314\\\":\\\"\\\\\\\"\\\",\\\"1315\\\":\\\"1\\\",\\\"1316\\\":\\\"4\\\",\\\"1317\\\":\\\"1\\\",\\\"1318\\\":\\\"\\\\\\\"\\\",\\\"1319\\\":\\\":\\\",\\\"1320\\\":\\\"\\\\\\\"\\\",\\\"1321\\\":\\\"_\\\",\\\"1322\\\":\\\"\\\\\\\"\\\",\\\"1323\\\":\\\",\\\",\\\"1324\\\":\\\"\\\\\\\"\\\",\\\"1325\\\":\\\"1\\\",\\\"1326\\\":\\\"4\\\",\\\"1327\\\":\\\"2\\\",\\\"1328\\\":\\\"\\\\\\\"\\\",\\\"1329\\\":\\\":\\\",\\\"1330\\\":\\\"\\\\\\\"\\\",\\\"1331\\\":\\\"a\\\",\\\"1332\\\":\\\"\\\\\\\"\\\",\\\"1333\\\":\\\",\\\",\\\"1334\\\":\\\"\\\\\\\"\\\",\\\"1335\\\":\\\"1\\\",\\\"1336\\\":\\\"4\\\",\\\"1337\\\":\\\"3\\\",\\\"1338\\\":\\\"\\\\\\\"\\\",\\\"1339\\\":\\\":\\\",\\\"1340\\\":\\\"\\\\\\\"\\\",\\\"1341\\\":\\\"t\\\",\\\"1342\\\":\\\"\\\\\\\"\\\",\\\"1343\\\":\\\",\\\",\\\"1344\\\":\\\"\\\\\\\"\\\",\\\"1345\\\":\\\"1\\\",\\\"1346\\\":\\\"4\\\",\\\"1347\\\":\\\"4\\\",\\\"1348\\\":\\\"\\\\\\\"\\\",\\\"1349\\\":\\\":\\\",\\\"1350\\\":\\\"\\\\\\\"\\\",\\\"1351\\\":\\\"\\\\\\\\\\\",\\\"1352\\\":\\\"\\\\\\\"\\\",\\\"1353\\\":\\\"\\\\\\\"\\\",\\\"1354\\\":\\\",\\\",\\\"1355\\\":\\\"\\\\\\\"\\\",\\\"1356\\\":\\\"1\\\",\\\"1357\\\":\\\"4\\\",\\\"1358\\\":\\\"5\\\",\\\"1359\\\":\\\"\\\\\\\"\\\",\\\"1360\\\":\\\":\\\",\\\"1361\\\":\\\"\\\\\\\"\\\",\\\"1362\\\":\\\":\\\",\\\"1363\\\":\\\"\\\\\\\"\\\",\\\"1364\\\":\\\",\\\",\\\"1365\\\":\\\"\\\\\\\"\\\",\\\"1366\\\":\\\"1\\\",\\\"1367\\\":\\\"4\\\",\\\"1368\\\":\\\"6\\\",\\\"1369\\\":\\\"\\\\\\\"\\\",\\\"1370\\\":\\\":\\\",\\\"1371\\\":\\\"\\\\\\\"\\\",\\\"1372\\\":\\\"\\\\\\\\\\\",\\\"1373\\\":\\\"\\\\\\\"\\\",\\\"1374\\\":\\\"\\\\\\\"\\\",\\\"1375\\\":\\\",\\\",\\\"1376\\\":\\\"\\\\\\\"\\\",\\\"1377\\\":\\\"1\\\",\\\"1378\\\":\\\"4\\\",\\\"1379\\\":\\\"7\\\",\\\"1380\\\":\\\"\\\\\\\"\\\",\\\"1381\\\":\\\":\\\",\\\"1382\\\":\\\"\\\\\\\"\\\",\\\"1383\\\":\\\"2\\\",\\\"1384\\\":\\\"\\\\\\\"\\\",\\\"1385\\\":\\\",\\\",\\\"1386\\\":\\\"\\\\\\\"\\\",\\\"1387\\\":\\\"1\\\",\\\"1388\\\":\\\"4\\\",\\\"1389\\\":\\\"8\\\",\\\"1390\\\":\\\"\\\\\\\"\\\",\\\"1391\\\":\\\":\\\",\\\"1392\\\":\\\"\\\\\\\"\\\",\\\"1393\\\":\\\"0\\\",\\\"1394\\\":\\\"\\\\\\\"\\\",\\\"1395\\\":\\\",\\\",\\\"1396\\\":\\\"\\\\\\\"\\\",\\\"1397\\\":\\\"1\\\",\\\"1398\\\":\\\"4\\\",\\\"1399\\\":\\\"9\\\",\\\"1400\\\":\\\"\\\\\\\"\\\",\\\"1401\\\":\\\":\\\",\\\"1402\\\":\\\"\\\\\\\"\\\",\\\"1403\\\":\\\"2\\\",\\\"1404\\\":\\\"\\\\\\\"\\\",\\\"1405\\\":\\\",\\\",\\\"1406\\\":\\\"\\\\\\\"\\\",\\\"1407\\\":\\\"1\\\",\\\"1408\\\":\\\"5\\\",\\\"1409\\\":\\\"0\\\",\\\"1410\\\":\\\"\\\\\\\"\\\",\\\"1411\\\":\\\":\\\",\\\"1412\\\":\\\"\\\\\\\"\\\",\\\"1413\\\":\\\"6\\\",\\\"1414\\\":\\\"\\\\\\\"\\\",\\\"1415\\\":\\\",\\\",\\\"1416\\\":\\\"\\\\\\\"\\\",\\\"1417\\\":\\\"1\\\",\\\"1418\\\":\\\"5\\\",\\\"1419\\\":\\\"1\\\",\\\"1420\\\":\\\"\\\\\\\"\\\",\\\"1421\\\":\\\":\\\",\\\"1422\\\":\\\"\\\\\\\"\\\",\\\"1423\\\":\\\"-\\\",\\\"1424\\\":\\\"\\\\\\\"\\\",\\\"1425\\\":\\\",\\\",\\\"1426\\\":\\\"\\\\\\\"\\\",\\\"1427\\\":\\\"1\\\",\\\"1428\\\":\\\"5\\\",\\\"1429\\\":\\\"2\\\",\\\"1430\\\":\\\"\\\\\\\"\\\",\\\"1431\\\":\\\":\\\",\\\"1432\\\":\\\"\\\\\\\"\\\",\\\"1433\\\":\\\"0\\\",\\\"1434\\\":\\\"\\\\\\\"\\\",\\\"1435\\\":\\\",\\\",\\\"1436\\\":\\\"\\\\\\\"\\\",\\\"1437\\\":\\\"1\\\",\\\"1438\\\":\\\"5\\\",\\\"1439\\\":\\\"3\\\",\\\"1440\\\":\\\"\\\\\\\"\\\",\\\"1441\\\":\\\":\\\",\\\"1442\\\":\\\"\\\\\\\"\\\",\\\"1443\\\":\\\"1\\\",\\\"1444\\\":\\\"\\\\\\\"\\\",\\\"1445\\\":\\\",\\\",\\\"1446\\\":\\\"\\\\\\\"\\\",\\\"1447\\\":\\\"1\\\",\\\"1448\\\":\\\"5\\\",\\\"1449\\\":\\\"4\\\",\\\"1450\\\":\\\"\\\\\\\"\\\",\\\"1451\\\":\\\":\\\",\\\"1452\\\":\\\"\\\\\\\"\\\",\\\"1453\\\":\\\"-\\\",\\\"1454\\\":\\\"\\\\\\\"\\\",\\\"1455\\\":\\\",\\\",\\\"1456\\\":\\\"\\\\\\\"\\\",\\\"1457\\\":\\\"1\\\",\\\"1458\\\":\\\"5\\\",\\\"1459\\\":\\\"5\\\",\\\"1460\\\":\\\"\\\\\\\"\\\",\\\"1461\\\":\\\":\\\",\\\"1462\\\":\\\"\\\\\\\"\\\",\\\"1463\\\":\\\"3\\\",\\\"1464\\\":\\\"\\\\\\\"\\\",\\\"1465\\\":\\\",\\\",\\\"1466\\\":\\\"\\\\\\\"\\\",\\\"1467\\\":\\\"1\\\",\\\"1468\\\":\\\"5\\\",\\\"1469\\\":\\\"6\\\",\\\"1470\\\":\\\"\\\\\\\"\\\",\\\"1471\\\":\\\":\\\",\\\"1472\\\":\\\"\\\\\\\"\\\",\\\"1473\\\":\\\"1\\\",\\\"1474\\\":\\\"\\\\\\\"\\\",\\\"1475\\\":\\\",\\\",\\\"1476\\\":\\\"\\\\\\\"\\\",\\\"1477\\\":\\\"1\\\",\\\"1478\\\":\\\"5\\\",\\\"1479\\\":\\\"7\\\",\\\"1480\\\":\\\"\\\\\\\"\\\",\\\"1481\\\":\\\":\\\",\\\"1482\\\":\\\"\\\\\\\"\\\",\\\"1483\\\":\\\"T\\\",\\\"1484\\\":\\\"\\\\\\\"\\\",\\\"1485\\\":\\\",\\\",\\\"1486\\\":\\\"\\\\\\\"\\\",\\\"1487\\\":\\\"1\\\",\\\"1488\\\":\\\"5\\\",\\\"1489\\\":\\\"8\\\",\\\"1490\\\":\\\"\\\\\\\"\\\",\\\"1491\\\":\\\":\\\",\\\"1492\\\":\\\"\\\\\\\"\\\",\\\"1493\\\":\\\"0\\\",\\\"1494\\\":\\\"\\\\\\\"\\\",\\\"1495\\\":\\\",\\\",\\\"1496\\\":\\\"\\\\\\\"\\\",\\\"1497\\\":\\\"1\\\",\\\"1498\\\":\\\"5\\\",\\\"1499\\\":\\\"9\\\",\\\"1500\\\":\\\"\\\\\\\"\\\",\\\"1501\\\":\\\":\\\",\\\"1502\\\":\\\"\\\\\\\"\\\",\\\"1503\\\":\\\"9\\\",\\\"1504\\\":\\\"\\\\\\\"\\\",\\\"1505\\\":\\\",\\\",\\\"1506\\\":\\\"\\\\\\\"\\\",\\\"1507\\\":\\\"1\\\",\\\"1508\\\":\\\"6\\\",\\\"1509\\\":\\\"0\\\",\\\"1510\\\":\\\"\\\\\\\"\\\",\\\"1511\\\":\\\":\\\",\\\"1512\\\":\\\"\\\\\\\"\\\",\\\"1513\\\":\\\":\\\",\\\"1514\\\":\\\"\\\\\\\"\\\",\\\"1515\\\":\\\",\\\",\\\"1516\\\":\\\"\\\\\\\"\\\",\\\"1517\\\":\\\"1\\\",\\\"1518\\\":\\\"6\\\",\\\"1519\\\":\\\"1\\\",\\\"1520\\\":\\\"\\\\\\\"\\\",\\\"1521\\\":\\\":\\\",\\\"1522\\\":\\\"\\\\\\\"\\\",\\\"1523\\\":\\\"3\\\",\\\"1524\\\":\\\"\\\\\\\"\\\",\\\"1525\\\":\\\",\\\",\\\"1526\\\":\\\"\\\\\\\"\\\",\\\"1527\\\":\\\"1\\\",\\\"1528\\\":\\\"6\\\",\\\"1529\\\":\\\"2\\\",\\\"1530\\\":\\\"\\\\\\\"\\\",\\\"1531\\\":\\\":\\\",\\\"1532\\\":\\\"\\\\\\\"\\\",\\\"1533\\\":\\\"6\\\",\\\"1534\\\":\\\"\\\\\\\"\\\",\\\"1535\\\":\\\",\\\",\\\"1536\\\":\\\"\\\\\\\"\\\",\\\"1537\\\":\\\"1\\\",\\\"1538\\\":\\\"6\\\",\\\"1539\\\":\\\"3\\\",\\\"1540\\\":\\\"\\\\\\\"\\\",\\\"1541\\\":\\\":\\\",\\\"1542\\\":\\\"\\\\\\\"\\\",\\\"1543\\\":\\\":\\\",\\\"1544\\\":\\\"\\\\\\\"\\\",\\\"1545\\\":\\\",\\\",\\\"1546\\\":\\\"\\\\\\\"\\\",\\\"1547\\\":\\\"1\\\",\\\"1548\\\":\\\"6\\\",\\\"1549\\\":\\\"4\\\",\\\"1550\\\":\\\"\\\\\\\"\\\",\\\"1551\\\":\\\":\\\",\\\"1552\\\":\\\"\\\\\\\"\\\",\\\"1553\\\":\\\"5\\\",\\\"1554\\\":\\\"\\\\\\\"\\\",\\\"1555\\\":\\\",\\\",\\\"1556\\\":\\\"\\\\\\\"\\\",\\\"1557\\\":\\\"1\\\",\\\"1558\\\":\\\"6\\\",\\\"1559\\\":\\\"5\\\",\\\"1560\\\":\\\"\\\\\\\"\\\",\\\"1561\\\":\\\":\\\",\\\"1562\\\":\\\"\\\\\\\"\\\",\\\"1563\\\":\\\"5\\\",\\\"1564\\\":\\\"\\\\\\\"\\\",\\\"1565\\\":\\\",\\\",\\\"1566\\\":\\\"\\\\\\\"\\\",\\\"1567\\\":\\\"1\\\",\\\"1568\\\":\\\"6\\\",\\\"1569\\\":\\\"6\\\",\\\"1570\\\":\\\"\\\\\\\"\\\",\\\"1571\\\":\\\":\\\",\\\"1572\\\":\\\"\\\\\\\"\\\",\\\"1573\\\":\\\".\\\",\\\"1574\\\":\\\"\\\\\\\"\\\",\\\"1575\\\":\\\",\\\",\\\"1576\\\":\\\"\\\\\\\"\\\",\\\"1577\\\":\\\"1\\\",\\\"1578\\\":\\\"6\\\",\\\"1579\\\":\\\"7\\\",\\\"1580\\\":\\\"\\\\\\\"\\\",\\\"1581\\\":\\\":\\\",\\\"1582\\\":\\\"\\\\\\\"\\\",\\\"1583\\\":\\\"0\\\",\\\"1584\\\":\\\"\\\\\\\"\\\",\\\"1585\\\":\\\",\\\",\\\"1586\\\":\\\"\\\\\\\"\\\",\\\"1587\\\":\\\"1\\\",\\\"1588\\\":\\\"6\\\",\\\"1589\\\":\\\"8\\\",\\\"1590\\\":\\\"\\\\\\\"\\\",\\\"1591\\\":\\\":\\\",\\\"1592\\\":\\\"\\\\\\\"\\\",\\\"1593\\\":\\\"5\\\",\\\"1594\\\":\\\"\\\\\\\"\\\",\\\"1595\\\":\\\",\\\",\\\"1596\\\":\\\"\\\\\\\"\\\",\\\"1597\\\":\\\"1\\\",\\\"1598\\\":\\\"6\\\",\\\"1599\\\":\\\"9\\\",\\\"1600\\\":\\\"\\\\\\\"\\\",\\\"1601\\\":\\\":\\\",\\\"1602\\\":\\\"\\\\\\\"\\\",\\\"1603\\\":\\\"1\\\",\\\"1604\\\":\\\"\\\\\\\"\\\",\\\"1605\\\":\\\",\\\",\\\"1606\\\":\\\"\\\\\\\"\\\",\\\"1607\\\":\\\"1\\\",\\\"1608\\\":\\\"7\\\",\\\"1609\\\":\\\"0\\\",\\\"1610\\\":\\\"\\\\\\\"\\\",\\\"1611\\\":\\\":\\\",\\\"1612\\\":\\\"\\\\\\\"\\\",\\\"1613\\\":\\\"Z\\\",\\\"1614\\\":\\\"\\\\\\\"\\\",\\\"1615\\\":\\\",\\\",\\\"1616\\\":\\\"\\\\\\\"\\\",\\\"1617\\\":\\\"1\\\",\\\"1618\\\":\\\"7\\\",\\\"1619\\\":\\\"1\\\",\\\"1620\\\":\\\"\\\\\\\"\\\",\\\"1621\\\":\\\":\\\",\\\"1622\\\":\\\"\\\\\\\"\\\",\\\"1623\\\":\\\"\\\\\\\\\\\",\\\"1624\\\":\\\"\\\\\\\"\\\",\\\"1625\\\":\\\"\\\\\\\"\\\",\\\"1626\\\":\\\",\\\",\\\"1627\\\":\\\"\\\\\\\"\\\",\\\"1628\\\":\\\"1\\\",\\\"1629\\\":\\\"7\\\",\\\"1630\\\":\\\"2\\\",\\\"1631\\\":\\\"\\\\\\\"\\\",\\\"1632\\\":\\\":\\\",\\\"1633\\\":\\\"\\\\\\\"\\\",\\\"1634\\\":\\\",\\\",\\\"1635\\\":\\\"\\\\\\\"\\\",\\\"1636\\\":\\\",\\\",\\\"1637\\\":\\\"\\\\\\\"\\\",\\\"1638\\\":\\\"1\\\",\\\"1639\\\":\\\"7\\\",\\\"1640\\\":\\\"3\\\",\\\"1641\\\":\\\"\\\\\\\"\\\",\\\"1642\\\":\\\":\\\",\\\"1643\\\":\\\"\\\\\\\"\\\",\\\"1644\\\":\\\"\\\\\\\\\\\",\\\"1645\\\":\\\"\\\\\\\"\\\",\\\"1646\\\":\\\"\\\\\\\"\\\",\\\"1647\\\":\\\",\\\",\\\"1648\\\":\\\"\\\\\\\"\\\",\\\"1649\\\":\\\"1\\\",\\\"1650\\\":\\\"7\\\",\\\"1651\\\":\\\"4\\\",\\\"1652\\\":\\\"\\\\\\\"\\\",\\\"1653\\\":\\\":\\\",\\\"1654\\\":\\\"\\\\\\\"\\\",\\\"1655\\\":\\\"u\\\",\\\"1656\\\":\\\"\\\\\\\"\\\",\\\"1657\\\":\\\",\\\",\\\"1658\\\":\\\"\\\\\\\"\\\",\\\"1659\\\":\\\"1\\\",\\\"1660\\\":\\\"7\\\",\\\"1661\\\":\\\"5\\\",\\\"1662\\\":\\\"\\\\\\\"\\\",\\\"1663\\\":\\\":\\\",\\\"1664\\\":\\\"\\\\\\\"\\\",\\\"1665\\\":\\\"s\\\",\\\"1666\\\":\\\"\\\\\\\"\\\",\\\"1667\\\":\\\",\\\",\\\"1668\\\":\\\"\\\\\\\"\\\",\\\"1669\\\":\\\"1\\\",\\\"1670\\\":\\\"7\\\",\\\"1671\\\":\\\"6\\\",\\\"1672\\\":\\\"\\\\\\\"\\\",\\\"1673\\\":\\\":\\\",\\\"1674\\\":\\\"\\\\\\\"\\\",\\\"1675\\\":\\\"e\\\",\\\"1676\\\":\\\"\\\\\\\"\\\",\\\"1677\\\":\\\",\\\",\\\"1678\\\":\\\"\\\\\\\"\\\",\\\"1679\\\":\\\"1\\\",\\\"1680\\\":\\\"7\\\",\\\"1681\\\":\\\"7\\\",\\\"1682\\\":\\\"\\\\\\\"\\\",\\\"1683\\\":\\\":\\\",\\\"1684\\\":\\\"\\\\\\\"\\\",\\\"1685\\\":\\\"r\\\",\\\"1686\\\":\\\"\\\\\\\"\\\",\\\"1687\\\":\\\",\\\",\\\"1688\\\":\\\"\\\\\\\"\\\",\\\"1689\\\":\\\"1\\\",\\\"1690\\\":\\\"7\\\",\\\"1691\\\":\\\"8\\\",\\\"1692\\\":\\\"\\\\\\\"\\\",\\\"1693\\\":\\\":\\\",\\\"1694\\\":\\\"\\\\\\\"\\\",\\\"1695\\\":\\\"_\\\",\\\"1696\\\":\\\"\\\\\\\"\\\",\\\"1697\\\":\\\",\\\",\\\"1698\\\":\\\"\\\\\\\"\\\",\\\"1699\\\":\\\"1\\\",\\\"1700\\\":\\\"7\\\",\\\"1701\\\":\\\"9\\\",\\\"1702\\\":\\\"\\\\\\\"\\\",\\\"1703\\\":\\\":\\\",\\\"1704\\\":\\\"\\\\\\\"\\\",\\\"1705\\\":\\\"a\\\",\\\"1706\\\":\\\"\\\\\\\"\\\",\\\"1707\\\":\\\",\\\",\\\"1708\\\":\\\"\\\\\\\"\\\",\\\"1709\\\":\\\"1\\\",\\\"1710\\\":\\\"8\\\",\\\"1711\\\":\\\"0\\\",\\\"1712\\\":\\\"\\\\\\\"\\\",\\\"1713\\\":\\\":\\\",\\\"1714\\\":\\\"\\\\\\\"\\\",\\\"1715\\\":\\\"g\\\",\\\"1716\\\":\\\"\\\\\\\"\\\",\\\"1717\\\":\\\",\\\",\\\"1718\\\":\\\"\\\\\\\"\\\",\\\"1719\\\":\\\"1\\\",\\\"1720\\\":\\\"8\\\",\\\"1721\\\":\\\"1\\\",\\\"1722\\\":\\\"\\\\\\\"\\\",\\\"1723\\\":\\\":\\\",\\\"1724\\\":\\\"\\\\\\\"\\\",\\\"1725\\\":\\\"e\\\",\\\"1726\\\":\\\"\\\\\\\"\\\",\\\"1727\\\":\\\",\\\",\\\"1728\\\":\\\"\\\\\\\"\\\",\\\"1729\\\":\\\"1\\\",\\\"1730\\\":\\\"8\\\",\\\"1731\\\":\\\"2\\\",\\\"1732\\\":\\\"\\\\\\\"\\\",\\\"1733\\\":\\\":\\\",\\\"1734\\\":\\\"\\\\\\\"\\\",\\\"1735\\\":\\\"n\\\",\\\"1736\\\":\\\"\\\\\\\"\\\",\\\"1737\\\":\\\",\\\",\\\"1738\\\":\\\"\\\\\\\"\\\",\\\"1739\\\":\\\"1\\\",\\\"1740\\\":\\\"8\\\",\\\"1741\\\":\\\"3\\\",\\\"1742\\\":\\\"\\\\\\\"\\\",\\\"1743\\\":\\\":\\\",\\\"1744\\\":\\\"\\\\\\\"\\\",\\\"1745\\\":\\\"t\\\",\\\"1746\\\":\\\"\\\\\\\"\\\",\\\"1747\\\":\\\",\\\",\\\"1748\\\":\\\"\\\\\\\"\\\",\\\"1749\\\":\\\"1\\\",\\\"1750\\\":\\\"8\\\",\\\"1751\\\":\\\"4\\\",\\\"1752\\\":\\\"\\\\\\\"\\\",\\\"1753\\\":\\\":\\\",\\\"1754\\\":\\\"\\\\\\\"\\\",\\\"1755\\\":\\\"\\\\\\\\\\\",\\\"1756\\\":\\\"\\\\\\\"\\\",\\\"1757\\\":\\\"\\\\\\\"\\\",\\\"1758\\\":\\\",\\\",\\\"1759\\\":\\\"\\\\\\\"\\\",\\\"1760\\\":\\\"1\\\",\\\"1761\\\":\\\"8\\\",\\\"1762\\\":\\\"5\\\",\\\"1763\\\":\\\"\\\\\\\"\\\",\\\"1764\\\":\\\":\\\",\\\"1765\\\":\\\"\\\\\\\"\\\",\\\"1766\\\":\\\":\\\",\\\"1767\\\":\\\"\\\\\\\"\\\",\\\"1768\\\":\\\",\\\",\\\"1769\\\":\\\"\\\\\\\"\\\",\\\"1770\\\":\\\"1\\\",\\\"1771\\\":\\\"8\\\",\\\"1772\\\":\\\"6\\\",\\\"1773\\\":\\\"\\\\\\\"\\\",\\\"1774\\\":\\\":\\\",\\\"1775\\\":\\\"\\\\\\\"\\\",\\\"1776\\\":\\\"\\\\\\\\\\\",\\\"1777\\\":\\\"\\\\\\\"\\\",\\\"1778\\\":\\\"\\\\\\\"\\\",\\\"1779\\\":\\\",\\\",\\\"1780\\\":\\\"\\\\\\\"\\\",\\\"1781\\\":\\\"1\\\",\\\"1782\\\":\\\"8\\\",\\\"1783\\\":\\\"7\\\",\\\"1784\\\":\\\"\\\\\\\"\\\",\\\"1785\\\":\\\":\\\",\\\"1786\\\":\\\"\\\\\\\"\\\",\\\"1787\\\":\\\"D\\\",\\\"1788\\\":\\\"\\\\\\\"\\\",\\\"1789\\\":\\\",\\\",\\\"1790\\\":\\\"\\\\\\\"\\\",\\\"1791\\\":\\\"1\\\",\\\"1792\\\":\\\"8\\\",\\\"1793\\\":\\\"8\\\",\\\"1794\\\":\\\"\\\\\\\"\\\",\\\"1795\\\":\\\":\\\",\\\"1796\\\":\\\"\\\\\\\"\\\",\\\"1797\\\":\\\"a\\\",\\\"1798\\\":\\\"\\\\\\\"\\\",\\\"1799\\\":\\\",\\\",\\\"1800\\\":\\\"\\\\\\\"\\\",\\\"1801\\\":\\\"1\\\",\\\"1802\\\":\\\"8\\\",\\\"1803\\\":\\\"9\\\",\\\"1804\\\":\\\"\\\\\\\"\\\",\\\"1805\\\":\\\":\\\",\\\"1806\\\":\\\"\\\\\\\"\\\",\\\"1807\\\":\\\"r\\\",\\\"1808\\\":\\\"\\\\\\\"\\\",\\\"1809\\\":\\\",\\\",\\\"1810\\\":\\\"\\\\\\\"\\\",\\\"1811\\\":\\\"1\\\",\\\"1812\\\":\\\"9\\\",\\\"1813\\\":\\\"0\\\",\\\"1814\\\":\\\"\\\\\\\"\\\",\\\"1815\\\":\\\":\\\",\\\"1816\\\":\\\"\\\\\\\"\\\",\\\"1817\\\":\\\"t\\\",\\\"1818\\\":\\\"\\\\\\\"\\\",\\\"1819\\\":\\\",\\\",\\\"1820\\\":\\\"\\\\\\\"\\\",\\\"1821\\\":\\\"1\\\",\\\"1822\\\":\\\"9\\\",\\\"1823\\\":\\\"1\\\",\\\"1824\\\":\\\"\\\\\\\"\\\",\\\"1825\\\":\\\":\\\",\\\"1826\\\":\\\"\\\\\\\"\\\",\\\"1827\\\":\\\"/\\\",\\\"1828\\\":\\\"\\\\\\\"\\\",\\\"1829\\\":\\\",\\\",\\\"1830\\\":\\\"\\\\\\\"\\\",\\\"1831\\\":\\\"1\\\",\\\"1832\\\":\\\"9\\\",\\\"1833\\\":\\\"2\\\",\\\"1834\\\":\\\"\\\\\\\"\\\",\\\"1835\\\":\\\":\\\",\\\"1836\\\":\\\"\\\\\\\"\\\",\\\"1837\\\":\\\"3\\\",\\\"1838\\\":\\\"\\\\\\\"\\\",\\\"1839\\\":\\\",\\\",\\\"1840\\\":\\\"\\\\\\\"\\\",\\\"1841\\\":\\\"1\\\",\\\"1842\\\":\\\"9\\\",\\\"1843\\\":\\\"3\\\",\\\"1844\\\":\\\"\\\\\\\"\\\",\\\"1845\\\":\\\":\\\",\\\"1846\\\":\\\"\\\\\\\"\\\",\\\"1847\\\":\\\".\\\",\\\"1848\\\":\\\"\\\\\\\"\\\",\\\"1849\\\":\\\",\\\",\\\"1850\\\":\\\"\\\\\\\"\\\",\\\"1851\\\":\\\"1\\\",\\\"1852\\\":\\\"9\\\",\\\"1853\\\":\\\"4\\\",\\\"1854\\\":\\\"\\\\\\\"\\\",\\\"1855\\\":\\\":\\\",\\\"1856\\\":\\\"\\\\\\\"\\\",\\\"1857\\\":\\\"1\\\",\\\"1858\\\":\\\"\\\\\\\"\\\",\\\"1859\\\":\\\",\\\",\\\"1860\\\":\\\"\\\\\\\"\\\",\\\"1861\\\":\\\"1\\\",\\\"1862\\\":\\\"9\\\",\\\"1863\\\":\\\"5\\\",\\\"1864\\\":\\\"\\\\\\\"\\\",\\\"1865\\\":\\\":\\\",\\\"1866\\\":\\\"\\\\\\\"\\\",\\\"1867\\\":\\\"0\\\",\\\"1868\\\":\\\"\\\\\\\"\\\",\\\"1869\\\":\\\",\\\",\\\"1870\\\":\\\"\\\\\\\"\\\",\\\"1871\\\":\\\"1\\\",\\\"1872\\\":\\\"9\\\",\\\"1873\\\":\\\"6\\\",\\\"1874\\\":\\\"\\\\\\\"\\\",\\\"1875\\\":\\\":\\\",\\\"1876\\\":\\\"\\\\\\\"\\\",\\\"1877\\\":\\\" \\\",\\\"1878\\\":\\\"\\\\\\\"\\\",\\\"1879\\\":\\\",\\\",\\\"1880\\\":\\\"\\\\\\\"\\\",\\\"1881\\\":\\\"1\\\",\\\"1882\\\":\\\"9\\\",\\\"1883\\\":\\\"7\\\",\\\"1884\\\":\\\"\\\\\\\"\\\",\\\"1885\\\":\\\":\\\",\\\"1886\\\":\\\"\\\\\\\"\\\",\\\"1887\\\":\\\"(\\\",\\\"1888\\\":\\\"\\\\\\\"\\\",\\\"1889\\\":\\\",\\\",\\\"1890\\\":\\\"\\\\\\\"\\\",\\\"1891\\\":\\\"1\\\",\\\"1892\\\":\\\"9\\\",\\\"1893\\\":\\\"8\\\",\\\"1894\\\":\\\"\\\\\\\"\\\",\\\"1895\\\":\\\":\\\",\\\"1896\\\":\\\"\\\\\\\"\\\",\\\"1897\\\":\\\"d\\\",\\\"1898\\\":\\\"\\\\\\\"\\\",\\\"1899\\\":\\\",\\\",\\\"1900\\\":\\\"\\\\\\\"\\\",\\\"1901\\\":\\\"1\\\",\\\"1902\\\":\\\"9\\\",\\\"1903\\\":\\\"9\\\",\\\"1904\\\":\\\"\\\\\\\"\\\",\\\"1905\\\":\\\":\\\",\\\"1906\\\":\\\"\\\\\\\"\\\",\\\"1907\\\":\\\"a\\\",\\\"1908\\\":\\\"\\\\\\\"\\\",\\\"1909\\\":\\\",\\\",\\\"1910\\\":\\\"\\\\\\\"\\\",\\\"1911\\\":\\\"2\\\",\\\"1912\\\":\\\"0\\\",\\\"1913\\\":\\\"0\\\",\\\"1914\\\":\\\"\\\\\\\"\\\",\\\"1915\\\":\\\":\\\",\\\"1916\\\":\\\"\\\\\\\"\\\",\\\"1917\\\":\\\"r\\\",\\\"1918\\\":\\\"\\\\\\\"\\\",\\\"1919\\\":\\\",\\\",\\\"1920\\\":\\\"\\\\\\\"\\\",\\\"1921\\\":\\\"2\\\",\\\"1922\\\":\\\"0\\\",\\\"1923\\\":\\\"1\\\",\\\"1924\\\":\\\"\\\\\\\"\\\",\\\"1925\\\":\\\":\\\",\\\"1926\\\":\\\"\\\\\\\"\\\",\\\"1927\\\":\\\"t\\\",\\\"1928\\\":\\\"\\\\\\\"\\\",\\\"1929\\\":\\\",\\\",\\\"1930\\\":\\\"\\\\\\\"\\\",\\\"1931\\\":\\\"2\\\",\\\"1932\\\":\\\"0\\\",\\\"1933\\\":\\\"2\\\",\\\"1934\\\":\\\"\\\\\\\"\\\",\\\"1935\\\":\\\":\\\",\\\"1936\\\":\\\"\\\\\\\"\\\",\\\"1937\\\":\\\":\\\",\\\"1938\\\":\\\"\\\\\\\"\\\",\\\"1939\\\":\\\",\\\",\\\"1940\\\":\\\"\\\\\\\"\\\",\\\"1941\\\":\\\"2\\\",\\\"1942\\\":\\\"0\\\",\\\"1943\\\":\\\"3\\\",\\\"1944\\\":\\\"\\\\\\\"\\\",\\\"1945\\\":\\\":\\\",\\\"1946\\\":\\\"\\\\\\\"\\\",\\\"1947\\\":\\\"i\\\",\\\"1948\\\":\\\"\\\\\\\"\\\",\\\"1949\\\":\\\",\\\",\\\"1950\\\":\\\"\\\\\\\"\\\",\\\"1951\\\":\\\"2\\\",\\\"1952\\\":\\\"0\\\",\\\"1953\\\":\\\"4\\\",\\\"1954\\\":\\\"\\\\\\\"\\\",\\\"1955\\\":\\\":\\\",\\\"1956\\\":\\\"\\\\\\\"\\\",\\\"1957\\\":\\\"o\\\",\\\"1958\\\":\\\"\\\\\\\"\\\",\\\"1959\\\":\\\",\\\",\\\"1960\\\":\\\"\\\\\\\"\\\",\\\"1961\\\":\\\"2\\\",\\\"1962\\\":\\\"0\\\",\\\"1963\\\":\\\"5\\\",\\\"1964\\\":\\\"\\\\\\\"\\\",\\\"1965\\\":\\\":\\\",\\\"1966\\\":\\\"\\\\\\\"\\\",\\\"1967\\\":\\\")\\\",\\\"1968\\\":\\\"\\\\\\\"\\\",\\\"1969\\\":\\\",\\\",\\\"1970\\\":\\\"\\\\\\\"\\\",\\\"1971\\\":\\\"2\\\",\\\"1972\\\":\\\"0\\\",\\\"1973\\\":\\\"6\\\",\\\"1974\\\":\\\"\\\\\\\"\\\",\\\"1975\\\":\\\":\\\",\\\"1976\\\":\\\"\\\\\\\"\\\",\\\"1977\\\":\\\"\\\\\\\\\\\",\\\"1978\\\":\\\"\\\\\\\"\\\",\\\"1979\\\":\\\"\\\\\\\"\\\",\\\"1980\\\":\\\",\\\",\\\"1981\\\":\\\"\\\\\\\"\\\",\\\"1982\\\":\\\"2\\\",\\\"1983\\\":\\\"0\\\",\\\"1984\\\":\\\"7\\\",\\\"1985\\\":\\\"\\\\\\\"\\\",\\\"1986\\\":\\\":\\\",\\\"1987\\\":\\\"\\\\\\\"\\\",\\\"1988\\\":\\\",\\\",\\\"1989\\\":\\\"\\\\\\\"\\\",\\\"1990\\\":\\\",\\\",\\\"1991\\\":\\\"\\\\\\\"\\\",\\\"1992\\\":\\\"2\\\",\\\"1993\\\":\\\"0\\\",\\\"1994\\\":\\\"8\\\",\\\"1995\\\":\\\"\\\\\\\"\\\",\\\"1996\\\":\\\":\\\",\\\"1997\\\":\\\"\\\\\\\"\\\",\\\"1998\\\":\\\"\\\\\\\\\\\",\\\"1999\\\":\\\"\\\\\\\"\\\",\\\"2000\\\":\\\"\\\\\\\"\\\",\\\"2001\\\":\\\",\\\",\\\"2002\\\":\\\"\\\\\\\"\\\",\\\"2003\\\":\\\"2\\\",\\\"2004\\\":\\\"0\\\",\\\"2005\\\":\\\"9\\\",\\\"2006\\\":\\\"\\\\\\\"\\\",\\\"2007\\\":\\\":\\\",\\\"2008\\\":\\\"\\\\\\\"\\\",\\\"2009\\\":\\\"i\\\",\\\"2010\\\":\\\"\\\\\\\"\\\",\\\"2011\\\":\\\",\\\",\\\"2012\\\":\\\"\\\\\\\"\\\",\\\"2013\\\":\\\"2\\\",\\\"2014\\\":\\\"1\\\",\\\"2015\\\":\\\"0\\\",\\\"2016\\\":\\\"\\\\\\\"\\\",\\\"2017\\\":\\\":\\\",\\\"2018\\\":\\\"\\\\\\\"\\\",\\\"2019\\\":\\\"s\\\",\\\"2020\\\":\\\"\\\\\\\"\\\",\\\"2021\\\":\\\",\\\",\\\"2022\\\":\\\"\\\\\\\"\\\",\\\"2023\\\":\\\"2\\\",\\\"2024\\\":\\\"1\\\",\\\"2025\\\":\\\"1\\\",\\\"2026\\\":\\\"\\\\\\\"\\\",\\\"2027\\\":\\\":\\\",\\\"2028\\\":\\\"\\\\\\\"\\\",\\\"2029\\\":\\\"_\\\",\\\"2030\\\":\\\"\\\\\\\"\\\",\\\"2031\\\":\\\",\\\",\\\"2032\\\":\\\"\\\\\\\"\\\",\\\"2033\\\":\\\"2\\\",\\\"2034\\\":\\\"1\\\",\\\"2035\\\":\\\"2\\\",\\\"2036\\\":\\\"\\\\\\\"\\\",\\\"2037\\\":\\\":\\\",\\\"2038\\\":\\\"\\\\\\\"\\\",\\\"2039\\\":\\\"q\\\",\\\"2040\\\":\\\"\\\\\\\"\\\",\\\"2041\\\":\\\",\\\",\\\"2042\\\":\\\"\\\\\\\"\\\",\\\"2043\\\":\\\"2\\\",\\\"2044\\\":\\\"1\\\",\\\"2045\\\":\\\"3\\\",\\\"2046\\\":\\\"\\\\\\\"\\\",\\\"2047\\\":\\\":\\\",\\\"2048\\\":\\\"\\\\\\\"\\\",\\\"2049\\\":\\\"u\\\",\\\"2050\\\":\\\"\\\\\\\"\\\",\\\"2051\\\":\\\",\\\",\\\"2052\\\":\\\"\\\\\\\"\\\",\\\"2053\\\":\\\"2\\\",\\\"2054\\\":\\\"1\\\",\\\"2055\\\":\\\"4\\\",\\\"2056\\\":\\\"\\\\\\\"\\\",\\\"2057\\\":\\\":\\\",\\\"2058\\\":\\\"\\\\\\\"\\\",\\\"2059\\\":\\\"e\\\",\\\"2060\\\":\\\"\\\\\\\"\\\",\\\"2061\\\":\\\",\\\",\\\"2062\\\":\\\"\\\\\\\"\\\",\\\"2063\\\":\\\"2\\\",\\\"2064\\\":\\\"1\\\",\\\"2065\\\":\\\"5\\\",\\\"2066\\\":\\\"\\\\\\\"\\\",\\\"2067\\\":\\\":\\\",\\\"2068\\\":\\\"\\\\\\\"\\\",\\\"2069\\\":\\\"u\\\",\\\"2070\\\":\\\"\\\\\\\"\\\",\\\"2071\\\":\\\",\\\",\\\"2072\\\":\\\"\\\\\\\"\\\",\\\"2073\\\":\\\"2\\\",\\\"2074\\\":\\\"1\\\",\\\"2075\\\":\\\"6\\\",\\\"2076\\\":\\\"\\\\\\\"\\\",\\\"2077\\\":\\\":\\\",\\\"2078\\\":\\\"\\\\\\\"\\\",\\\"2079\\\":\\\"e\\\",\\\"2080\\\":\\\"\\\\\\\"\\\",\\\"2081\\\":\\\",\\\",\\\"2082\\\":\\\"\\\\\\\"\\\",\\\"2083\\\":\\\"2\\\",\\\"2084\\\":\\\"1\\\",\\\"2085\\\":\\\"7\\\",\\\"2086\\\":\\\"\\\\\\\"\\\",\\\"2087\\\":\\\":\\\",\\\"2088\\\":\\\"\\\\\\\"\\\",\\\"2089\\\":\\\"d\\\",\\\"2090\\\":\\\"\\\\\\\"\\\",\\\"2091\\\":\\\",\\\",\\\"2092\\\":\\\"\\\\\\\"\\\",\\\"2093\\\":\\\"2\\\",\\\"2094\\\":\\\"1\\\",\\\"2095\\\":\\\"8\\\",\\\"2096\\\":\\\"\\\\\\\"\\\",\\\"2097\\\":\\\":\\\",\\\"2098\\\":\\\"\\\\\\\"\\\",\\\"2099\\\":\\\"\\\\\\\\\\\",\\\"2100\\\":\\\"\\\\\\\"\\\",\\\"2101\\\":\\\"\\\\\\\"\\\",\\\"2102\\\":\\\",\\\",\\\"2103\\\":\\\"\\\\\\\"\\\",\\\"2104\\\":\\\"2\\\",\\\"2105\\\":\\\"1\\\",\\\"2106\\\":\\\"9\\\",\\\"2107\\\":\\\"\\\\\\\"\\\",\\\"2108\\\":\\\":\\\",\\\"2109\\\":\\\"\\\\\\\"\\\",\\\"2110\\\":\\\":\\\",\\\"2111\\\":\\\"\\\\\\\"\\\",\\\"2112\\\":\\\",\\\",\\\"2113\\\":\\\"\\\\\\\"\\\",\\\"2114\\\":\\\"2\\\",\\\"2115\\\":\\\"2\\\",\\\"2116\\\":\\\"0\\\",\\\"2117\\\":\\\"\\\\\\\"\\\",\\\"2118\\\":\\\":\\\",\\\"2119\\\":\\\"\\\\\\\"\\\",\\\"2120\\\":\\\"f\\\",\\\"2121\\\":\\\"\\\\\\\"\\\",\\\"2122\\\":\\\",\\\",\\\"2123\\\":\\\"\\\\\\\"\\\",\\\"2124\\\":\\\"2\\\",\\\"2125\\\":\\\"2\\\",\\\"2126\\\":\\\"1\\\",\\\"2127\\\":\\\"\\\\\\\"\\\",\\\"2128\\\":\\\":\\\",\\\"2129\\\":\\\"\\\\\\\"\\\",\\\"2130\\\":\\\"a\\\",\\\"2131\\\":\\\"\\\\\\\"\\\",\\\"2132\\\":\\\",\\\",\\\"2133\\\":\\\"\\\\\\\"\\\",\\\"2134\\\":\\\"2\\\",\\\"2135\\\":\\\"2\\\",\\\"2136\\\":\\\"2\\\",\\\"2137\\\":\\\"\\\\\\\"\\\",\\\"2138\\\":\\\":\\\",\\\"2139\\\":\\\"\\\\\\\"\\\",\\\"2140\\\":\\\"l\\\",\\\"2141\\\":\\\"\\\\\\\"\\\",\\\"2142\\\":\\\",\\\",\\\"2143\\\":\\\"\\\\\\\"\\\",\\\"2144\\\":\\\"2\\\",\\\"2145\\\":\\\"2\\\",\\\"2146\\\":\\\"3\\\",\\\"2147\\\":\\\"\\\\\\\"\\\",\\\"2148\\\":\\\":\\\",\\\"2149\\\":\\\"\\\\\\\"\\\",\\\"2150\\\":\\\"s\\\",\\\"2151\\\":\\\"\\\\\\\"\\\",\\\"2152\\\":\\\",\\\",\\\"2153\\\":\\\"\\\\\\\"\\\",\\\"2154\\\":\\\"2\\\",\\\"2155\\\":\\\"2\\\",\\\"2156\\\":\\\"4\\\",\\\"2157\\\":\\\"\\\\\\\"\\\",\\\"2158\\\":\\\":\\\",\\\"2159\\\":\\\"\\\\\\\"\\\",\\\"2160\\\":\\\"e\\\",\\\"2161\\\":\\\"\\\\\\\"\\\",\\\"2162\\\":\\\",\\\",\\\"2163\\\":\\\"\\\\\\\"\\\",\\\"2164\\\":\\\"2\\\",\\\"2165\\\":\\\"2\\\",\\\"2166\\\":\\\"5\\\",\\\"2167\\\":\\\"\\\\\\\"\\\",\\\"2168\\\":\\\":\\\",\\\"2169\\\":\\\"\\\\\\\"\\\",\\\"2170\\\":\\\",\\\",\\\"2171\\\":\\\"\\\\\\\"\\\",\\\"2172\\\":\\\",\\\",\\\"2173\\\":\\\"\\\\\\\"\\\",\\\"2174\\\":\\\"2\\\",\\\"2175\\\":\\\"2\\\",\\\"2176\\\":\\\"6\\\",\\\"2177\\\":\\\"\\\\\\\"\\\",\\\"2178\\\":\\\":\\\",\\\"2179\\\":\\\"\\\\\\\"\\\",\\\"2180\\\":\\\"\\\\\\\\\\\",\\\"2181\\\":\\\"\\\\\\\"\\\",\\\"2182\\\":\\\"\\\\\\\"\\\",\\\"2183\\\":\\\",\\\",\\\"2184\\\":\\\"\\\\\\\"\\\",\\\"2185\\\":\\\"2\\\",\\\"2186\\\":\\\"2\\\",\\\"2187\\\":\\\"7\\\",\\\"2188\\\":\\\"\\\\\\\"\\\",\\\"2189\\\":\\\":\\\",\\\"2190\\\":\\\"\\\\\\\"\\\",\\\"2191\\\":\\\"q\\\",\\\"2192\\\":\\\"\\\\\\\"\\\",\\\"2193\\\":\\\",\\\",\\\"2194\\\":\\\"\\\\\\\"\\\",\\\"2195\\\":\\\"2\\\",\\\"2196\\\":\\\"2\\\",\\\"2197\\\":\\\"8\\\",\\\"2198\\\":\\\"\\\\\\\"\\\",\\\"2199\\\":\\\":\\\",\\\"2200\\\":\\\"\\\\\\\"\\\",\\\"2201\\\":\\\"u\\\",\\\"2202\\\":\\\"\\\\\\\"\\\",\\\"2203\\\":\\\",\\\",\\\"2204\\\":\\\"\\\\\\\"\\\",\\\"2205\\\":\\\"2\\\",\\\"2206\\\":\\\"2\\\",\\\"2207\\\":\\\"9\\\",\\\"2208\\\":\\\"\\\\\\\"\\\",\\\"2209\\\":\\\":\\\",\\\"2210\\\":\\\"\\\\\\\"\\\",\\\"2211\\\":\\\"e\\\",\\\"2212\\\":\\\"\\\\\\\"\\\",\\\"2213\\\":\\\",\\\",\\\"2214\\\":\\\"\\\\\\\"\\\",\\\"2215\\\":\\\"2\\\",\\\"2216\\\":\\\"3\\\",\\\"2217\\\":\\\"0\\\",\\\"2218\\\":\\\"\\\\\\\"\\\",\\\"2219\\\":\\\":\\\",\\\"2220\\\":\\\"\\\\\\\"\\\",\\\"2221\\\":\\\"u\\\",\\\"2222\\\":\\\"\\\\\\\"\\\",\\\"2223\\\":\\\",\\\",\\\"2224\\\":\\\"\\\\\\\"\\\",\\\"2225\\\":\\\"2\\\",\\\"2226\\\":\\\"3\\\",\\\"2227\\\":\\\"1\\\",\\\"2228\\\":\\\"\\\\\\\"\\\",\\\"2229\\\":\\\":\\\",\\\"2230\\\":\\\"\\\\\\\"\\\",\\\"2231\\\":\\\"e\\\",\\\"2232\\\":\\\"\\\\\\\"\\\",\\\"2233\\\":\\\",\\\",\\\"2234\\\":\\\"\\\\\\\"\\\",\\\"2235\\\":\\\"2\\\",\\\"2236\\\":\\\"3\\\",\\\"2237\\\":\\\"2\\\",\\\"2238\\\":\\\"\\\\\\\"\\\",\\\"2239\\\":\\\":\\\",\\\"2240\\\":\\\"\\\\\\\"\\\",\\\"2241\\\":\\\"d\\\",\\\"2242\\\":\\\"\\\\\\\"\\\",\\\"2243\\\":\\\",\\\",\\\"2244\\\":\\\"\\\\\\\"\\\",\\\"2245\\\":\\\"2\\\",\\\"2246\\\":\\\"3\\\",\\\"2247\\\":\\\"3\\\",\\\"2248\\\":\\\"\\\\\\\"\\\",\\\"2249\\\":\\\":\\\",\\\"2250\\\":\\\"\\\\\\\"\\\",\\\"2251\\\":\\\"_\\\",\\\"2252\\\":\\\"\\\\\\\"\\\",\\\"2253\\\":\\\",\\\",\\\"2254\\\":\\\"\\\\\\\"\\\",\\\"2255\\\":\\\"2\\\",\\\"2256\\\":\\\"3\\\",\\\"2257\\\":\\\"4\\\",\\\"2258\\\":\\\"\\\\\\\"\\\",\\\"2259\\\":\\\":\\\",\\\"2260\\\":\\\"\\\\\\\"\\\",\\\"2261\\\":\\\"a\\\",\\\"2262\\\":\\\"\\\\\\\"\\\",\\\"2263\\\":\\\",\\\",\\\"2264\\\":\\\"\\\\\\\"\\\",\\\"2265\\\":\\\"2\\\",\\\"2266\\\":\\\"3\\\",\\\"2267\\\":\\\"5\\\",\\\"2268\\\":\\\"\\\\\\\"\\\",\\\"2269\\\":\\\":\\\",\\\"2270\\\":\\\"\\\\\\\"\\\",\\\"2271\\\":\\\"f\\\",\\\"2272\\\":\\\"\\\\\\\"\\\",\\\"2273\\\":\\\",\\\",\\\"2274\\\":\\\"\\\\\\\"\\\",\\\"2275\\\":\\\"2\\\",\\\"2276\\\":\\\"3\\\",\\\"2277\\\":\\\"6\\\",\\\"2278\\\":\\\"\\\\\\\"\\\",\\\"2279\\\":\\\":\\\",\\\"2280\\\":\\\"\\\\\\\"\\\",\\\"2281\\\":\\\"t\\\",\\\"2282\\\":\\\"\\\\\\\"\\\",\\\"2283\\\":\\\",\\\",\\\"2284\\\":\\\"\\\\\\\"\\\",\\\"2285\\\":\\\"2\\\",\\\"2286\\\":\\\"3\\\",\\\"2287\\\":\\\"7\\\",\\\"2288\\\":\\\"\\\\\\\"\\\",\\\"2289\\\":\\\":\\\",\\\"2290\\\":\\\"\\\\\\\"\\\",\\\"2291\\\":\\\"e\\\",\\\"2292\\\":\\\"\\\\\\\"\\\",\\\"2293\\\":\\\",\\\",\\\"2294\\\":\\\"\\\\\\\"\\\",\\\"2295\\\":\\\"2\\\",\\\"2296\\\":\\\"3\\\",\\\"2297\\\":\\\"8\\\",\\\"2298\\\":\\\"\\\\\\\"\\\",\\\"2299\\\":\\\":\\\",\\\"2300\\\":\\\"\\\\\\\"\\\",\\\"2301\\\":\\\"r\\\",\\\"2302\\\":\\\"\\\\\\\"\\\",\\\"2303\\\":\\\",\\\",\\\"2304\\\":\\\"\\\\\\\"\\\",\\\"2305\\\":\\\"2\\\",\\\"2306\\\":\\\"3\\\",\\\"2307\\\":\\\"9\\\",\\\"2308\\\":\\\"\\\\\\\"\\\",\\\"2309\\\":\\\":\\\",\\\"2310\\\":\\\"\\\\\\\"\\\",\\\"2311\\\":\\\"_\\\",\\\"2312\\\":\\\"\\\\\\\"\\\",\\\"2313\\\":\\\",\\\",\\\"2314\\\":\\\"\\\\\\\"\\\",\\\"2315\\\":\\\"2\\\",\\\"2316\\\":\\\"4\\\",\\\"2317\\\":\\\"0\\\",\\\"2318\\\":\\\"\\\\\\\"\\\",\\\"2319\\\":\\\":\\\",\\\"2320\\\":\\\"\\\\\\\"\\\",\\\"2321\\\":\\\"s\\\",\\\"2322\\\":\\\"\\\\\\\"\\\",\\\"2323\\\":\\\",\\\",\\\"2324\\\":\\\"\\\\\\\"\\\",\\\"2325\\\":\\\"2\\\",\\\"2326\\\":\\\"4\\\",\\\"2327\\\":\\\"1\\\",\\\"2328\\\":\\\"\\\\\\\"\\\",\\\"2329\\\":\\\":\\\",\\\"2330\\\":\\\"\\\\\\\"\\\",\\\"2331\\\":\\\"u\\\",\\\"2332\\\":\\\"\\\\\\\"\\\",\\\"2333\\\":\\\",\\\",\\\"2334\\\":\\\"\\\\\\\"\\\",\\\"2335\\\":\\\"2\\\",\\\"2336\\\":\\\"4\\\",\\\"2337\\\":\\\"2\\\",\\\"2338\\\":\\\"\\\\\\\"\\\",\\\"2339\\\":\\\":\\\",\\\"2340\\\":\\\"\\\\\\\"\\\",\\\"2341\\\":\\\"b\\\",\\\"2342\\\":\\\"\\\\\\\"\\\",\\\"2343\\\":\\\",\\\",\\\"2344\\\":\\\"\\\\\\\"\\\",\\\"2345\\\":\\\"2\\\",\\\"2346\\\":\\\"4\\\",\\\"2347\\\":\\\"3\\\",\\\"2348\\\":\\\"\\\\\\\"\\\",\\\"2349\\\":\\\":\\\",\\\"2350\\\":\\\"\\\\\\\"\\\",\\\"2351\\\":\\\"s\\\",\\\"2352\\\":\\\"\\\\\\\"\\\",\\\"2353\\\":\\\",\\\",\\\"2354\\\":\\\"\\\\\\\"\\\",\\\"2355\\\":\\\"2\\\",\\\"2356\\\":\\\"4\\\",\\\"2357\\\":\\\"4\\\",\\\"2358\\\":\\\"\\\\\\\"\\\",\\\"2359\\\":\\\":\\\",\\\"2360\\\":\\\"\\\\\\\"\\\",\\\"2361\\\":\\\"c\\\",\\\"2362\\\":\\\"\\\\\\\"\\\",\\\"2363\\\":\\\",\\\",\\\"2364\\\":\\\"\\\\\\\"\\\",\\\"2365\\\":\\\"2\\\",\\\"2366\\\":\\\"4\\\",\\\"2367\\\":\\\"5\\\",\\\"2368\\\":\\\"\\\\\\\"\\\",\\\"2369\\\":\\\":\\\",\\\"2370\\\":\\\"\\\\\\\"\\\",\\\"2371\\\":\\\"r\\\",\\\"2372\\\":\\\"\\\\\\\"\\\",\\\"2373\\\":\\\",\\\",\\\"2374\\\":\\\"\\\\\\\"\\\",\\\"2375\\\":\\\"2\\\",\\\"2376\\\":\\\"4\\\",\\\"2377\\\":\\\"6\\\",\\\"2378\\\":\\\"\\\\\\\"\\\",\\\"2379\\\":\\\":\\\",\\\"2380\\\":\\\"\\\\\\\"\\\",\\\"2381\\\":\\\"i\\\",\\\"2382\\\":\\\"\\\\\\\"\\\",\\\"2383\\\":\\\",\\\",\\\"2384\\\":\\\"\\\\\\\"\\\",\\\"2385\\\":\\\"2\\\",\\\"2386\\\":\\\"4\\\",\\\"2387\\\":\\\"7\\\",\\\"2388\\\":\\\"\\\\\\\"\\\",\\\"2389\\\":\\\":\\\",\\\"2390\\\":\\\"\\\\\\\"\\\",\\\"2391\\\":\\\"p\\\",\\\"2392\\\":\\\"\\\\\\\"\\\",\\\"2393\\\":\\\",\\\",\\\"2394\\\":\\\"\\\\\\\"\\\",\\\"2395\\\":\\\"2\\\",\\\"2396\\\":\\\"4\\\",\\\"2397\\\":\\\"8\\\",\\\"2398\\\":\\\"\\\\\\\"\\\",\\\"2399\\\":\\\":\\\",\\\"2400\\\":\\\"\\\\\\\"\\\",\\\"2401\\\":\\\"t\\\",\\\"2402\\\":\\\"\\\\\\\"\\\",\\\"2403\\\":\\\",\\\",\\\"2404\\\":\\\"\\\\\\\"\\\",\\\"2405\\\":\\\"2\\\",\\\"2406\\\":\\\"4\\\",\\\"2407\\\":\\\"9\\\",\\\"2408\\\":\\\"\\\\\\\"\\\",\\\"2409\\\":\\\":\\\",\\\"2410\\\":\\\"\\\\\\\"\\\",\\\"2411\\\":\\\"i\\\",\\\"2412\\\":\\\"\\\\\\\"\\\",\\\"2413\\\":\\\",\\\",\\\"2414\\\":\\\"\\\\\\\"\\\",\\\"2415\\\":\\\"2\\\",\\\"2416\\\":\\\"5\\\",\\\"2417\\\":\\\"0\\\",\\\"2418\\\":\\\"\\\\\\\"\\\",\\\"2419\\\":\\\":\\\",\\\"2420\\\":\\\"\\\\\\\"\\\",\\\"2421\\\":\\\"o\\\",\\\"2422\\\":\\\"\\\\\\\"\\\",\\\"2423\\\":\\\",\\\",\\\"2424\\\":\\\"\\\\\\\"\\\",\\\"2425\\\":\\\"2\\\",\\\"2426\\\":\\\"5\\\",\\\"2427\\\":\\\"1\\\",\\\"2428\\\":\\\"\\\\\\\"\\\",\\\"2429\\\":\\\":\\\",\\\"2430\\\":\\\"\\\\\\\"\\\",\\\"2431\\\":\\\"n\\\",\\\"2432\\\":\\\"\\\\\\\"\\\",\\\"2433\\\":\\\",\\\",\\\"2434\\\":\\\"\\\\\\\"\\\",\\\"2435\\\":\\\"2\\\",\\\"2436\\\":\\\"5\\\",\\\"2437\\\":\\\"2\\\",\\\"2438\\\":\\\"\\\\\\\"\\\",\\\"2439\\\":\\\":\\\",\\\"2440\\\":\\\"\\\\\\\"\\\",\\\"2441\\\":\\\"\\\\\\\\\\\",\\\"2442\\\":\\\"\\\\\\\"\\\",\\\"2443\\\":\\\"\\\\\\\"\\\",\\\"2444\\\":\\\",\\\",\\\"2445\\\":\\\"\\\\\\\"\\\",\\\"2446\\\":\\\"2\\\",\\\"2447\\\":\\\"5\\\",\\\"2448\\\":\\\"3\\\",\\\"2449\\\":\\\"\\\\\\\"\\\",\\\"2450\\\":\\\":\\\",\\\"2451\\\":\\\"\\\\\\\"\\\",\\\"2452\\\":\\\":\\\",\\\"2453\\\":\\\"\\\\\\\"\\\",\\\"2454\\\":\\\",\\\",\\\"2455\\\":\\\"\\\\\\\"\\\",\\\"2456\\\":\\\"2\\\",\\\"2457\\\":\\\"5\\\",\\\"2458\\\":\\\"4\\\",\\\"2459\\\":\\\"\\\\\\\"\\\",\\\"2460\\\":\\\":\\\",\\\"2461\\\":\\\"\\\\\\\"\\\",\\\"2462\\\":\\\"n\\\",\\\"2463\\\":\\\"\\\\\\\"\\\",\\\"2464\\\":\\\",\\\",\\\"2465\\\":\\\"\\\\\\\"\\\",\\\"2466\\\":\\\"2\\\",\\\"2467\\\":\\\"5\\\",\\\"2468\\\":\\\"5\\\",\\\"2469\\\":\\\"\\\\\\\"\\\",\\\"2470\\\":\\\":\\\",\\\"2471\\\":\\\"\\\\\\\"\\\",\\\"2472\\\":\\\"u\\\",\\\"2473\\\":\\\"\\\\\\\"\\\",\\\"2474\\\":\\\",\\\",\\\"2475\\\":\\\"\\\\\\\"\\\",\\\"2476\\\":\\\"2\\\",\\\"2477\\\":\\\"5\\\",\\\"2478\\\":\\\"6\\\",\\\"2479\\\":\\\"\\\\\\\"\\\",\\\"2480\\\":\\\":\\\",\\\"2481\\\":\\\"\\\\\\\"\\\",\\\"2482\\\":\\\"l\\\",\\\"2483\\\":\\\"\\\\\\\"\\\",\\\"2484\\\":\\\",\\\",\\\"2485\\\":\\\"\\\\\\\"\\\",\\\"2486\\\":\\\"2\\\",\\\"2487\\\":\\\"5\\\",\\\"2488\\\":\\\"7\\\",\\\"2489\\\":\\\"\\\\\\\"\\\",\\\"2490\\\":\\\":\\\",\\\"2491\\\":\\\"\\\\\\\"\\\",\\\"2492\\\":\\\"l\\\",\\\"2493\\\":\\\"\\\\\\\"\\\",\\\"2494\\\":\\\",\\\",\\\"2495\\\":\\\"\\\\\\\"\\\",\\\"2496\\\":\\\"2\\\",\\\"2497\\\":\\\"5\\\",\\\"2498\\\":\\\"8\\\",\\\"2499\\\":\\\"\\\\\\\"\\\",\\\"2500\\\":\\\":\\\",\\\"2501\\\":\\\"\\\\\\\"\\\",\\\"2502\\\":\\\",\\\",\\\"2503\\\":\\\"\\\\\\\"\\\",\\\"2504\\\":\\\",\\\",\\\"2505\\\":\\\"\\\\\\\"\\\",\\\"2506\\\":\\\"2\\\",\\\"2507\\\":\\\"5\\\",\\\"2508\\\":\\\"9\\\",\\\"2509\\\":\\\"\\\\\\\"\\\",\\\"2510\\\":\\\":\\\",\\\"2511\\\":\\\"\\\\\\\"\\\",\\\"2512\\\":\\\"\\\\\\\\\\\",\\\"2513\\\":\\\"\\\\\\\"\\\",\\\"2514\\\":\\\"\\\\\\\"\\\",\\\"2515\\\":\\\",\\\",\\\"2516\\\":\\\"\\\\\\\"\\\",\\\"2517\\\":\\\"2\\\",\\\"2518\\\":\\\"6\\\",\\\"2519\\\":\\\"0\\\",\\\"2520\\\":\\\"\\\\\\\"\\\",\\\"2521\\\":\\\":\\\",\\\"2522\\\":\\\"\\\\\\\"\\\",\\\"2523\\\":\\\"c\\\",\\\"2524\\\":\\\"\\\\\\\"\\\",\\\"2525\\\":\\\",\\\",\\\"2526\\\":\\\"\\\\\\\"\\\",\\\"2527\\\":\\\"2\\\",\\\"2528\\\":\\\"6\\\",\\\"2529\\\":\\\"1\\\",\\\"2530\\\":\\\"\\\\\\\"\\\",\\\"2531\\\":\\\":\\\",\\\"2532\\\":\\\"\\\\\\\"\\\",\\\"2533\\\":\\\"u\\\",\\\"2534\\\":\\\"\\\\\\\"\\\",\\\"2535\\\":\\\",\\\",\\\"2536\\\":\\\"\\\\\\\"\\\",\\\"2537\\\":\\\"2\\\",\\\"2538\\\":\\\"6\\\",\\\"2539\\\":\\\"2\\\",\\\"2540\\\":\\\"\\\\\\\"\\\",\\\"2541\\\":\\\":\\\",\\\"2542\\\":\\\"\\\\\\\"\\\",\\\"2543\\\":\\\"r\\\",\\\"2544\\\":\\\"\\\\\\\"\\\",\\\"2545\\\":\\\",\\\",\\\"2546\\\":\\\"\\\\\\\"\\\",\\\"2547\\\":\\\"2\\\",\\\"2548\\\":\\\"6\\\",\\\"2549\\\":\\\"3\\\",\\\"2550\\\":\\\"\\\\\\\"\\\",\\\"2551\\\":\\\":\\\",\\\"2552\\\":\\\"\\\\\\\"\\\",\\\"2553\\\":\\\"r\\\",\\\"2554\\\":\\\"\\\\\\\"\\\",\\\"2555\\\":\\\",\\\",\\\"2556\\\":\\\"\\\\\\\"\\\",\\\"2557\\\":\\\"2\\\",\\\"2558\\\":\\\"6\\\",\\\"2559\\\":\\\"4\\\",\\\"2560\\\":\\\"\\\\\\\"\\\",\\\"2561\\\":\\\":\\\",\\\"2562\\\":\\\"\\\\\\\"\\\",\\\"2563\\\":\\\"e\\\",\\\"2564\\\":\\\"\\\\\\\"\\\",\\\"2565\\\":\\\",\\\",\\\"2566\\\":\\\"\\\\\\\"\\\",\\\"2567\\\":\\\"2\\\",\\\"2568\\\":\\\"6\\\",\\\"2569\\\":\\\"5\\\",\\\"2570\\\":\\\"\\\\\\\"\\\",\\\"2571\\\":\\\":\\\",\\\"2572\\\":\\\"\\\\\\\"\\\",\\\"2573\\\":\\\"n\\\",\\\"2574\\\":\\\"\\\\\\\"\\\",\\\"2575\\\":\\\",\\\",\\\"2576\\\":\\\"\\\\\\\"\\\",\\\"2577\\\":\\\"2\\\",\\\"2578\\\":\\\"6\\\",\\\"2579\\\":\\\"6\\\",\\\"2580\\\":\\\"\\\\\\\"\\\",\\\"2581\\\":\\\":\\\",\\\"2582\\\":\\\"\\\\\\\"\\\",\\\"2583\\\":\\\"t\\\",\\\"2584\\\":\\\"\\\\\\\"\\\",\\\"2585\\\":\\\",\\\",\\\"2586\\\":\\\"\\\\\\\"\\\",\\\"2587\\\":\\\"2\\\",\\\"2588\\\":\\\"6\\\",\\\"2589\\\":\\\"7\\\",\\\"2590\\\":\\\"\\\\\\\"\\\",\\\"2591\\\":\\\":\\\",\\\"2592\\\":\\\"\\\\\\\"\\\",\\\"2593\\\":\\\"_\\\",\\\"2594\\\":\\\"\\\\\\\"\\\",\\\"2595\\\":\\\",\\\",\\\"2596\\\":\\\"\\\\\\\"\\\",\\\"2597\\\":\\\"2\\\",\\\"2598\\\":\\\"6\\\",\\\"2599\\\":\\\"8\\\",\\\"2600\\\":\\\"\\\\\\\"\\\",\\\"2601\\\":\\\":\\\",\\\"2602\\\":\\\"\\\\\\\"\\\",\\\"2603\\\":\\\"s\\\",\\\"2604\\\":\\\"\\\\\\\"\\\",\\\"2605\\\":\\\",\\\",\\\"2606\\\":\\\"\\\\\\\"\\\",\\\"2607\\\":\\\"2\\\",\\\"2608\\\":\\\"6\\\",\\\"2609\\\":\\\"9\\\",\\\"2610\\\":\\\"\\\\\\\"\\\",\\\"2611\\\":\\\":\\\",\\\"2612\\\":\\\"\\\\\\\"\\\",\\\"2613\\\":\\\"u\\\",\\\"2614\\\":\\\"\\\\\\\"\\\",\\\"2615\\\":\\\",\\\",\\\"2616\\\":\\\"\\\\\\\"\\\",\\\"2617\\\":\\\"2\\\",\\\"2618\\\":\\\"7\\\",\\\"2619\\\":\\\"0\\\",\\\"2620\\\":\\\"\\\\\\\"\\\",\\\"2621\\\":\\\":\\\",\\\"2622\\\":\\\"\\\\\\\"\\\",\\\"2623\\\":\\\"b\\\",\\\"2624\\\":\\\"\\\\\\\"\\\",\\\"2625\\\":\\\",\\\",\\\"2626\\\":\\\"\\\\\\\"\\\",\\\"2627\\\":\\\"2\\\",\\\"2628\\\":\\\"7\\\",\\\"2629\\\":\\\"1\\\",\\\"2630\\\":\\\"\\\\\\\"\\\",\\\"2631\\\":\\\":\\\",\\\"2632\\\":\\\"\\\\\\\"\\\",\\\"2633\\\":\\\"s\\\",\\\"2634\\\":\\\"\\\\\\\"\\\",\\\"2635\\\":\\\",\\\",\\\"2636\\\":\\\"\\\\\\\"\\\",\\\"2637\\\":\\\"2\\\",\\\"2638\\\":\\\"7\\\",\\\"2639\\\":\\\"2\\\",\\\"2640\\\":\\\"\\\\\\\"\\\",\\\"2641\\\":\\\":\\\",\\\"2642\\\":\\\"\\\\\\\"\\\",\\\"2643\\\":\\\"c\\\",\\\"2644\\\":\\\"\\\\\\\"\\\",\\\"2645\\\":\\\",\\\",\\\"2646\\\":\\\"\\\\\\\"\\\",\\\"2647\\\":\\\"2\\\",\\\"2648\\\":\\\"7\\\",\\\"2649\\\":\\\"3\\\",\\\"2650\\\":\\\"\\\\\\\"\\\",\\\"2651\\\":\\\":\\\",\\\"2652\\\":\\\"\\\\\\\"\\\",\\\"2653\\\":\\\"r\\\",\\\"2654\\\":\\\"\\\\\\\"\\\",\\\"2655\\\":\\\",\\\",\\\"2656\\\":\\\"\\\\\\\"\\\",\\\"2657\\\":\\\"2\\\",\\\"2658\\\":\\\"7\\\",\\\"2659\\\":\\\"4\\\",\\\"2660\\\":\\\"\\\\\\\"\\\",\\\"2661\\\":\\\":\\\",\\\"2662\\\":\\\"\\\\\\\"\\\",\\\"2663\\\":\\\"i\\\",\\\"2664\\\":\\\"\\\\\\\"\\\",\\\"2665\\\":\\\",\\\",\\\"2666\\\":\\\"\\\\\\\"\\\",\\\"2667\\\":\\\"2\\\",\\\"2668\\\":\\\"7\\\",\\\"2669\\\":\\\"5\\\",\\\"2670\\\":\\\"\\\\\\\"\\\",\\\"2671\\\":\\\":\\\",\\\"2672\\\":\\\"\\\\\\\"\\\",\\\"2673\\\":\\\"p\\\",\\\"2674\\\":\\\"\\\\\\\"\\\",\\\"2675\\\":\\\",\\\",\\\"2676\\\":\\\"\\\\\\\"\\\",\\\"2677\\\":\\\"2\\\",\\\"2678\\\":\\\"7\\\",\\\"2679\\\":\\\"6\\\",\\\"2680\\\":\\\"\\\\\\\"\\\",\\\"2681\\\":\\\":\\\",\\\"2682\\\":\\\"\\\\\\\"\\\",\\\"2683\\\":\\\"t\\\",\\\"2684\\\":\\\"\\\\\\\"\\\",\\\"2685\\\":\\\",\\\",\\\"2686\\\":\\\"\\\\\\\"\\\",\\\"2687\\\":\\\"2\\\",\\\"2688\\\":\\\"7\\\",\\\"2689\\\":\\\"7\\\",\\\"2690\\\":\\\"\\\\\\\"\\\",\\\"2691\\\":\\\":\\\",\\\"2692\\\":\\\"\\\\\\\"\\\",\\\"2693\\\":\\\"i\\\",\\\"2694\\\":\\\"\\\\\\\"\\\",\\\"2695\\\":\\\",\\\",\\\"2696\\\":\\\"\\\\\\\"\\\",\\\"2697\\\":\\\"2\\\",\\\"2698\\\":\\\"7\\\",\\\"2699\\\":\\\"8\\\",\\\"2700\\\":\\\"\\\\\\\"\\\",\\\"2701\\\":\\\":\\\",\\\"2702\\\":\\\"\\\\\\\"\\\",\\\"2703\\\":\\\"o\\\",\\\"2704\\\":\\\"\\\\\\\"\\\",\\\"2705\\\":\\\",\\\",\\\"2706\\\":\\\"\\\\\\\"\\\",\\\"2707\\\":\\\"2\\\",\\\"2708\\\":\\\"7\\\",\\\"2709\\\":\\\"9\\\",\\\"2710\\\":\\\"\\\\\\\"\\\",\\\"2711\\\":\\\":\\\",\\\"2712\\\":\\\"\\\\\\\"\\\",\\\"2713\\\":\\\"n\\\",\\\"2714\\\":\\\"\\\\\\\"\\\",\\\"2715\\\":\\\",\\\",\\\"2716\\\":\\\"\\\\\\\"\\\",\\\"2717\\\":\\\"2\\\",\\\"2718\\\":\\\"8\\\",\\\"2719\\\":\\\"0\\\",\\\"2720\\\":\\\"\\\\\\\"\\\",\\\"2721\\\":\\\":\\\",\\\"2722\\\":\\\"\\\\\\\"\\\",\\\"2723\\\":\\\"_\\\",\\\"2724\\\":\\\"\\\\\\\"\\\",\\\"2725\\\":\\\",\\\",\\\"2726\\\":\\\"\\\\\\\"\\\",\\\"2727\\\":\\\"2\\\",\\\"2728\\\":\\\"8\\\",\\\"2729\\\":\\\"1\\\",\\\"2730\\\":\\\"\\\\\\\"\\\",\\\"2731\\\":\\\":\\\",\\\"2732\\\":\\\"\\\\\\\"\\\",\\\"2733\\\":\\\"e\\\",\\\"2734\\\":\\\"\\\\\\\"\\\",\\\"2735\\\":\\\",\\\",\\\"2736\\\":\\\"\\\\\\\"\\\",\\\"2737\\\":\\\"2\\\",\\\"2738\\\":\\\"8\\\",\\\"2739\\\":\\\"2\\\",\\\"2740\\\":\\\"\\\\\\\"\\\",\\\"2741\\\":\\\":\\\",\\\"2742\\\":\\\"\\\\\\\"\\\",\\\"2743\\\":\\\"n\\\",\\\"2744\\\":\\\"\\\\\\\"\\\",\\\"2745\\\":\\\",\\\",\\\"2746\\\":\\\"\\\\\\\"\\\",\\\"2747\\\":\\\"2\\\",\\\"2748\\\":\\\"8\\\",\\\"2749\\\":\\\"3\\\",\\\"2750\\\":\\\"\\\\\\\"\\\",\\\"2751\\\":\\\":\\\",\\\"2752\\\":\\\"\\\\\\\"\\\",\\\"2753\\\":\\\"d\\\",\\\"2754\\\":\\\"\\\\\\\"\\\",\\\"2755\\\":\\\",\\\",\\\"2756\\\":\\\"\\\\\\\"\\\",\\\"2757\\\":\\\"2\\\",\\\"2758\\\":\\\"8\\\",\\\"2759\\\":\\\"4\\\",\\\"2760\\\":\\\"\\\\\\\"\\\",\\\"2761\\\":\\\":\\\",\\\"2762\\\":\\\"\\\\\\\"\\\",\\\"2763\\\":\\\"_\\\",\\\"2764\\\":\\\"\\\\\\\"\\\",\\\"2765\\\":\\\",\\\",\\\"2766\\\":\\\"\\\\\\\"\\\",\\\"2767\\\":\\\"2\\\",\\\"2768\\\":\\\"8\\\",\\\"2769\\\":\\\"5\\\",\\\"2770\\\":\\\"\\\\\\\"\\\",\\\"2771\\\":\\\":\\\",\\\"2772\\\":\\\"\\\\\\\"\\\",\\\"2773\\\":\\\"d\\\",\\\"2774\\\":\\\"\\\\\\\"\\\",\\\"2775\\\":\\\",\\\",\\\"2776\\\":\\\"\\\\\\\"\\\",\\\"2777\\\":\\\"2\\\",\\\"2778\\\":\\\"8\\\",\\\"2779\\\":\\\"6\\\",\\\"2780\\\":\\\"\\\\\\\"\\\",\\\"2781\\\":\\\":\\\",\\\"2782\\\":\\\"\\\\\\\"\\\",\\\"2783\\\":\\\"a\\\",\\\"2784\\\":\\\"\\\\\\\"\\\",\\\"2785\\\":\\\",\\\",\\\"2786\\\":\\\"\\\\\\\"\\\",\\\"2787\\\":\\\"2\\\",\\\"2788\\\":\\\"8\\\",\\\"2789\\\":\\\"7\\\",\\\"2790\\\":\\\"\\\\\\\"\\\",\\\"2791\\\":\\\":\\\",\\\"2792\\\":\\\"\\\\\\\"\\\",\\\"2793\\\":\\\"t\\\",\\\"2794\\\":\\\"\\\\\\\"\\\",\\\"2795\\\":\\\",\\\",\\\"2796\\\":\\\"\\\\\\\"\\\",\\\"2797\\\":\\\"2\\\",\\\"2798\\\":\\\"8\\\",\\\"2799\\\":\\\"8\\\",\\\"2800\\\":\\\"\\\\\\\"\\\",\\\"2801\\\":\\\":\\\",\\\"2802\\\":\\\"\\\\\\\"\\\",\\\"2803\\\":\\\"e\\\",\\\"2804\\\":\\\"\\\\\\\"\\\",\\\"2805\\\":\\\",\\\",\\\"2806\\\":\\\"\\\\\\\"\\\",\\\"2807\\\":\\\"2\\\",\\\"2808\\\":\\\"8\\\",\\\"2809\\\":\\\"9\\\",\\\"2810\\\":\\\"\\\\\\\"\\\",\\\"2811\\\":\\\":\\\",\\\"2812\\\":\\\"\\\\\\\"\\\",\\\"2813\\\":\\\"\\\\\\\\\\\",\\\"2814\\\":\\\"\\\\\\\"\\\",\\\"2815\\\":\\\"\\\\\\\"\\\",\\\"2816\\\":\\\",\\\",\\\"2817\\\":\\\"\\\\\\\"\\\",\\\"2818\\\":\\\"2\\\",\\\"2819\\\":\\\"9\\\",\\\"2820\\\":\\\"0\\\",\\\"2821\\\":\\\"\\\\\\\"\\\",\\\"2822\\\":\\\":\\\",\\\"2823\\\":\\\"\\\\\\\"\\\",\\\"2824\\\":\\\":\\\",\\\"2825\\\":\\\"\\\\\\\"\\\",\\\"2826\\\":\\\",\\\",\\\"2827\\\":\\\"\\\\\\\"\\\",\\\"2828\\\":\\\"2\\\",\\\"2829\\\":\\\"9\\\",\\\"2830\\\":\\\"1\\\",\\\"2831\\\":\\\"\\\\\\\"\\\",\\\"2832\\\":\\\":\\\",\\\"2833\\\":\\\"\\\\\\\"\\\",\\\"2834\\\":\\\"n\\\",\\\"2835\\\":\\\"\\\\\\\"\\\",\\\"2836\\\":\\\",\\\",\\\"2837\\\":\\\"\\\\\\\"\\\",\\\"2838\\\":\\\"2\\\",\\\"2839\\\":\\\"9\\\",\\\"2840\\\":\\\"2\\\",\\\"2841\\\":\\\"\\\\\\\"\\\",\\\"2842\\\":\\\":\\\",\\\"2843\\\":\\\"\\\\\\\"\\\",\\\"2844\\\":\\\"u\\\",\\\"2845\\\":\\\"\\\\\\\"\\\",\\\"2846\\\":\\\",\\\",\\\"2847\\\":\\\"\\\\\\\"\\\",\\\"2848\\\":\\\"2\\\",\\\"2849\\\":\\\"9\\\",\\\"2850\\\":\\\"3\\\",\\\"2851\\\":\\\"\\\\\\\"\\\",\\\"2852\\\":\\\":\\\",\\\"2853\\\":\\\"\\\\\\\"\\\",\\\"2854\\\":\\\"l\\\",\\\"2855\\\":\\\"\\\\\\\"\\\",\\\"2856\\\":\\\",\\\",\\\"2857\\\":\\\"\\\\\\\"\\\",\\\"2858\\\":\\\"2\\\",\\\"2859\\\":\\\"9\\\",\\\"2860\\\":\\\"4\\\",\\\"2861\\\":\\\"\\\\\\\"\\\",\\\"2862\\\":\\\":\\\",\\\"2863\\\":\\\"\\\\\\\"\\\",\\\"2864\\\":\\\"l\\\",\\\"2865\\\":\\\"\\\\\\\"\\\",\\\"2866\\\":\\\",\\\",\\\"2867\\\":\\\"\\\\\\\"\\\",\\\"2868\\\":\\\"2\\\",\\\"2869\\\":\\\"9\\\",\\\"2870\\\":\\\"5\\\",\\\"2871\\\":\\\"\\\\\\\"\\\",\\\"2872\\\":\\\":\\\",\\\"2873\\\":\\\"\\\\\\\"\\\",\\\"2874\\\":\\\",\\\",\\\"2875\\\":\\\"\\\\\\\"\\\",\\\"2876\\\":\\\",\\\",\\\"2877\\\":\\\"\\\\\\\"\\\",\\\"2878\\\":\\\"2\\\",\\\"2879\\\":\\\"9\\\",\\\"2880\\\":\\\"6\\\",\\\"2881\\\":\\\"\\\\\\\"\\\",\\\"2882\\\":\\\":\\\",\\\"2883\\\":\\\"\\\\\\\"\\\",\\\"2884\\\":\\\"\\\\\\\\\\\",\\\"2885\\\":\\\"\\\\\\\"\\\",\\\"2886\\\":\\\"\\\\\\\"\\\",\\\"2887\\\":\\\",\\\",\\\"2888\\\":\\\"\\\\\\\"\\\",\\\"2889\\\":\\\"2\\\",\\\"2890\\\":\\\"9\\\",\\\"2891\\\":\\\"7\\\",\\\"2892\\\":\\\"\\\\\\\"\\\",\\\"2893\\\":\\\":\\\",\\\"2894\\\":\\\"\\\\\\\"\\\",\\\"2895\\\":\\\"c\\\",\\\"2896\\\":\\\"\\\\\\\"\\\",\\\"2897\\\":\\\",\\\",\\\"2898\\\":\\\"\\\\\\\"\\\",\\\"2899\\\":\\\"2\\\",\\\"2900\\\":\\\"9\\\",\\\"2901\\\":\\\"8\\\",\\\"2902\\\":\\\"\\\\\\\"\\\",\\\"2903\\\":\\\":\\\",\\\"2904\\\":\\\"\\\\\\\"\\\",\\\"2905\\\":\\\"u\\\",\\\"2906\\\":\\\"\\\\\\\"\\\",\\\"2907\\\":\\\",\\\",\\\"2908\\\":\\\"\\\\\\\"\\\",\\\"2909\\\":\\\"2\\\",\\\"2910\\\":\\\"9\\\",\\\"2911\\\":\\\"9\\\",\\\"2912\\\":\\\"\\\\\\\"\\\",\\\"2913\\\":\\\":\\\",\\\"2914\\\":\\\"\\\\\\\"\\\",\\\"2915\\\":\\\"r\\\",\\\"2916\\\":\\\"\\\\\\\"\\\",\\\"2917\\\":\\\",\\\",\\\"2918\\\":\\\"\\\\\\\"\\\",\\\"2919\\\":\\\"3\\\",\\\"2920\\\":\\\"0\\\",\\\"2921\\\":\\\"0\\\",\\\"2922\\\":\\\"\\\\\\\"\\\",\\\"2923\\\":\\\":\\\",\\\"2924\\\":\\\"\\\\\\\"\\\",\\\"2925\\\":\\\"r\\\",\\\"2926\\\":\\\"\\\\\\\"\\\",\\\"2927\\\":\\\",\\\",\\\"2928\\\":\\\"\\\\\\\"\\\",\\\"2929\\\":\\\"3\\\",\\\"2930\\\":\\\"0\\\",\\\"2931\\\":\\\"1\\\",\\\"2932\\\":\\\"\\\\\\\"\\\",\\\"2933\\\":\\\":\\\",\\\"2934\\\":\\\"\\\\\\\"\\\",\\\"2935\\\":\\\"e\\\",\\\"2936\\\":\\\"\\\\\\\"\\\",\\\"2937\\\":\\\",\\\",\\\"2938\\\":\\\"\\\\\\\"\\\",\\\"2939\\\":\\\"3\\\",\\\"2940\\\":\\\"0\\\",\\\"2941\\\":\\\"2\\\",\\\"2942\\\":\\\"\\\\\\\"\\\",\\\"2943\\\":\\\":\\\",\\\"2944\\\":\\\"\\\\\\\"\\\",\\\"2945\\\":\\\"n\\\",\\\"2946\\\":\\\"\\\\\\\"\\\",\\\"2947\\\":\\\",\\\",\\\"2948\\\":\\\"\\\\\\\"\\\",\\\"2949\\\":\\\"3\\\",\\\"2950\\\":\\\"0\\\",\\\"2951\\\":\\\"3\\\",\\\"2952\\\":\\\"\\\\\\\"\\\",\\\"2953\\\":\\\":\\\",\\\"2954\\\":\\\"\\\\\\\"\\\",\\\"2955\\\":\\\"t\\\",\\\"2956\\\":\\\"\\\\\\\"\\\",\\\"2957\\\":\\\",\\\",\\\"2958\\\":\\\"\\\\\\\"\\\",\\\"2959\\\":\\\"3\\\",\\\"2960\\\":\\\"0\\\",\\\"2961\\\":\\\"4\\\",\\\"2962\\\":\\\"\\\\\\\"\\\",\\\"2963\\\":\\\":\\\",\\\"2964\\\":\\\"\\\\\\\"\\\",\\\"2965\\\":\\\"_\\\",\\\"2966\\\":\\\"\\\\\\\"\\\",\\\"2967\\\":\\\",\\\",\\\"2968\\\":\\\"\\\\\\\"\\\",\\\"2969\\\":\\\"3\\\",\\\"2970\\\":\\\"0\\\",\\\"2971\\\":\\\"5\\\",\\\"2972\\\":\\\"\\\\\\\"\\\",\\\"2973\\\":\\\":\\\",\\\"2974\\\":\\\"\\\\\\\"\\\",\\\"2975\\\":\\\"s\\\",\\\"2976\\\":\\\"\\\\\\\"\\\",\\\"2977\\\":\\\",\\\",\\\"2978\\\":\\\"\\\\\\\"\\\",\\\"2979\\\":\\\"3\\\",\\\"2980\\\":\\\"0\\\",\\\"2981\\\":\\\"6\\\",\\\"2982\\\":\\\"\\\\\\\"\\\",\\\"2983\\\":\\\":\\\",\\\"2984\\\":\\\"\\\\\\\"\\\",\\\"2985\\\":\\\"u\\\",\\\"2986\\\":\\\"\\\\\\\"\\\",\\\"2987\\\":\\\",\\\",\\\"2988\\\":\\\"\\\\\\\"\\\",\\\"2989\\\":\\\"3\\\",\\\"2990\\\":\\\"0\\\",\\\"2991\\\":\\\"7\\\",\\\"2992\\\":\\\"\\\\\\\"\\\",\\\"2993\\\":\\\":\\\",\\\"2994\\\":\\\"\\\\\\\"\\\",\\\"2995\\\":\\\"b\\\",\\\"2996\\\":\\\"\\\\\\\"\\\",\\\"2997\\\":\\\",\\\",\\\"2998\\\":\\\"\\\\\\\"\\\",\\\"2999\\\":\\\"3\\\",\\\"3000\\\":\\\"0\\\",\\\"3001\\\":\\\"8\\\",\\\"3002\\\":\\\"\\\\\\\"\\\",\\\"3003\\\":\\\":\\\",\\\"3004\\\":\\\"\\\\\\\"\\\",\\\"3005\\\":\\\"s\\\",\\\"3006\\\":\\\"\\\\\\\"\\\",\\\"3007\\\":\\\",\\\",\\\"3008\\\":\\\"\\\\\\\"\\\",\\\"3009\\\":\\\"3\\\",\\\"3010\\\":\\\"0\\\",\\\"3011\\\":\\\"9\\\",\\\"3012\\\":\\\"\\\\\\\"\\\",\\\"3013\\\":\\\":\\\",\\\"3014\\\":\\\"\\\\\\\"\\\",\\\"3015\\\":\\\"c\\\",\\\"3016\\\":\\\"\\\\\\\"\\\",\\\"3017\\\":\\\",\\\",\\\"3018\\\":\\\"\\\\\\\"\\\",\\\"3019\\\":\\\"3\\\",\\\"3020\\\":\\\"1\\\",\\\"3021\\\":\\\"0\\\",\\\"3022\\\":\\\"\\\\\\\"\\\",\\\"3023\\\":\\\":\\\",\\\"3024\\\":\\\"\\\\\\\"\\\",\\\"3025\\\":\\\"r\\\",\\\"3026\\\":\\\"\\\\\\\"\\\",\\\"3027\\\":\\\",\\\",\\\"3028\\\":\\\"\\\\\\\"\\\",\\\"3029\\\":\\\"3\\\",\\\"3030\\\":\\\"1\\\",\\\"3031\\\":\\\"1\\\",\\\"3032\\\":\\\"\\\\\\\"\\\",\\\"3033\\\":\\\":\\\",\\\"3034\\\":\\\"\\\\\\\"\\\",\\\"3035\\\":\\\"i\\\",\\\"3036\\\":\\\"\\\\\\\"\\\",\\\"3037\\\":\\\",\\\",\\\"3038\\\":\\\"\\\\\\\"\\\",\\\"3039\\\":\\\"3\\\",\\\"3040\\\":\\\"1\\\",\\\"3041\\\":\\\"2\\\",\\\"3042\\\":\\\"\\\\\\\"\\\",\\\"3043\\\":\\\":\\\",\\\"3044\\\":\\\"\\\\\\\"\\\",\\\"3045\\\":\\\"p\\\",\\\"3046\\\":\\\"\\\\\\\"\\\",\\\"3047\\\":\\\",\\\",\\\"3048\\\":\\\"\\\\\\\"\\\",\\\"3049\\\":\\\"3\\\",\\\"3050\\\":\\\"1\\\",\\\"3051\\\":\\\"3\\\",\\\"3052\\\":\\\"\\\\\\\"\\\",\\\"3053\\\":\\\":\\\",\\\"3054\\\":\\\"\\\\\\\"\\\",\\\"3055\\\":\\\"t\\\",\\\"3056\\\":\\\"\\\\\\\"\\\",\\\"3057\\\":\\\",\\\",\\\"3058\\\":\\\"\\\\\\\"\\\",\\\"3059\\\":\\\"3\\\",\\\"3060\\\":\\\"1\\\",\\\"3061\\\":\\\"4\\\",\\\"3062\\\":\\\"\\\\\\\"\\\",\\\"3063\\\":\\\":\\\",\\\"3064\\\":\\\"\\\\\\\"\\\",\\\"3065\\\":\\\"i\\\",\\\"3066\\\":\\\"\\\\\\\"\\\",\\\"3067\\\":\\\",\\\",\\\"3068\\\":\\\"\\\\\\\"\\\",\\\"3069\\\":\\\"3\\\",\\\"3070\\\":\\\"1\\\",\\\"3071\\\":\\\"5\\\",\\\"3072\\\":\\\"\\\\\\\"\\\",\\\"3073\\\":\\\":\\\",\\\"3074\\\":\\\"\\\\\\\"\\\",\\\"3075\\\":\\\"o\\\",\\\"3076\\\":\\\"\\\\\\\"\\\",\\\"3077\\\":\\\",\\\",\\\"3078\\\":\\\"\\\\\\\"\\\",\\\"3079\\\":\\\"3\\\",\\\"3080\\\":\\\"1\\\",\\\"3081\\\":\\\"6\\\",\\\"3082\\\":\\\"\\\\\\\"\\\",\\\"3083\\\":\\\":\\\",\\\"3084\\\":\\\"\\\\\\\"\\\",\\\"3085\\\":\\\"n\\\",\\\"3086\\\":\\\"\\\\\\\"\\\",\\\"3087\\\":\\\",\\\",\\\"3088\\\":\\\"\\\\\\\"\\\",\\\"3089\\\":\\\"3\\\",\\\"3090\\\":\\\"1\\\",\\\"3091\\\":\\\"7\\\",\\\"3092\\\":\\\"\\\\\\\"\\\",\\\"3093\\\":\\\":\\\",\\\"3094\\\":\\\"\\\\\\\"\\\",\\\"3095\\\":\\\"_\\\",\\\"3096\\\":\\\"\\\\\\\"\\\",\\\"3097\\\":\\\",\\\",\\\"3098\\\":\\\"\\\\\\\"\\\",\\\"3099\\\":\\\"3\\\",\\\"3100\\\":\\\"1\\\",\\\"3101\\\":\\\"8\\\",\\\"3102\\\":\\\"\\\\\\\"\\\",\\\"3103\\\":\\\":\\\",\\\"3104\\\":\\\"\\\\\\\"\\\",\\\"3105\\\":\\\"r\\\",\\\"3106\\\":\\\"\\\\\\\"\\\",\\\"3107\\\":\\\",\\\",\\\"3108\\\":\\\"\\\\\\\"\\\",\\\"3109\\\":\\\"3\\\",\\\"3110\\\":\\\"1\\\",\\\"3111\\\":\\\"9\\\",\\\"3112\\\":\\\"\\\\\\\"\\\",\\\"3113\\\":\\\":\\\",\\\"3114\\\":\\\"\\\\\\\"\\\",\\\"3115\\\":\\\"i\\\",\\\"3116\\\":\\\"\\\\\\\"\\\",\\\"3117\\\":\\\",\\\",\\\"3118\\\":\\\"\\\\\\\"\\\",\\\"3119\\\":\\\"3\\\",\\\"3120\\\":\\\"2\\\",\\\"3121\\\":\\\"0\\\",\\\"3122\\\":\\\"\\\\\\\"\\\",\\\"3123\\\":\\\":\\\",\\\"3124\\\":\\\"\\\\\\\"\\\",\\\"3125\\\":\\\"d\\\",\\\"3126\\\":\\\"\\\\\\\"\\\",\\\"3127\\\":\\\",\\\",\\\"3128\\\":\\\"\\\\\\\"\\\",\\\"3129\\\":\\\"3\\\",\\\"3130\\\":\\\"2\\\",\\\"3131\\\":\\\"1\\\",\\\"3132\\\":\\\"\\\\\\\"\\\",\\\"3133\\\":\\\":\\\",\\\"3134\\\":\\\"\\\\\\\"\\\",\\\"3135\\\":\\\"e\\\",\\\"3136\\\":\\\"\\\\\\\"\\\",\\\"3137\\\":\\\",\\\",\\\"3138\\\":\\\"\\\\\\\"\\\",\\\"3139\\\":\\\"3\\\",\\\"3140\\\":\\\"2\\\",\\\"3141\\\":\\\"2\\\",\\\"3142\\\":\\\"\\\\\\\"\\\",\\\"3143\\\":\\\":\\\",\\\"3144\\\":\\\"\\\\\\\"\\\",\\\"3145\\\":\\\"s\\\",\\\"3146\\\":\\\"\\\\\\\"\\\",\\\"3147\\\":\\\",\\\",\\\"3148\\\":\\\"\\\\\\\"\\\",\\\"3149\\\":\\\"3\\\",\\\"3150\\\":\\\"2\\\",\\\"3151\\\":\\\"3\\\",\\\"3152\\\":\\\"\\\\\\\"\\\",\\\"3153\\\":\\\":\\\",\\\"3154\\\":\\\"\\\\\\\"\\\",\\\"3155\\\":\\\"_\\\",\\\"3156\\\":\\\"\\\\\\\"\\\",\\\"3157\\\":\\\",\\\",\\\"3158\\\":\\\"\\\\\\\"\\\",\\\"3159\\\":\\\"3\\\",\\\"3160\\\":\\\"2\\\",\\\"3161\\\":\\\"4\\\",\\\"3162\\\":\\\"\\\\\\\"\\\",\\\"3163\\\":\\\":\\\",\\\"3164\\\":\\\"\\\\\\\"\\\",\\\"3165\\\":\\\"r\\\",\\\"3166\\\":\\\"\\\\\\\"\\\",\\\"3167\\\":\\\",\\\",\\\"3168\\\":\\\"\\\\\\\"\\\",\\\"3169\\\":\\\"3\\\",\\\"3170\\\":\\\"2\\\",\\\"3171\\\":\\\"5\\\",\\\"3172\\\":\\\"\\\\\\\"\\\",\\\"3173\\\":\\\":\\\",\\\"3174\\\":\\\"\\\\\\\"\\\",\\\"3175\\\":\\\"e\\\",\\\"3176\\\":\\\"\\\\\\\"\\\",\\\"3177\\\":\\\",\\\",\\\"3178\\\":\\\"\\\\\\\"\\\",\\\"3179\\\":\\\"3\\\",\\\"3180\\\":\\\"2\\\",\\\"3181\\\":\\\"6\\\",\\\"3182\\\":\\\"\\\\\\\"\\\",\\\"3183\\\":\\\":\\\",\\\"3184\\\":\\\"\\\\\\\"\\\",\\\"3185\\\":\\\"m\\\",\\\"3186\\\":\\\"\\\\\\\"\\\",\\\"3187\\\":\\\",\\\",\\\"3188\\\":\\\"\\\\\\\"\\\",\\\"3189\\\":\\\"3\\\",\\\"3190\\\":\\\"2\\\",\\\"3191\\\":\\\"7\\\",\\\"3192\\\":\\\"\\\\\\\"\\\",\\\"3193\\\":\\\":\\\",\\\"3194\\\":\\\"\\\\\\\"\\\",\\\"3195\\\":\\\"a\\\",\\\"3196\\\":\\\"\\\\\\\"\\\",\\\"3197\\\":\\\",\\\",\\\"3198\\\":\\\"\\\\\\\"\\\",\\\"3199\\\":\\\"3\\\",\\\"3200\\\":\\\"2\\\",\\\"3201\\\":\\\"8\\\",\\\"3202\\\":\\\"\\\\\\\"\\\",\\\"3203\\\":\\\":\\\",\\\"3204\\\":\\\"\\\\\\\"\\\",\\\"3205\\\":\\\"i\\\",\\\"3206\\\":\\\"\\\\\\\"\\\",\\\"3207\\\":\\\",\\\",\\\"3208\\\":\\\"\\\\\\\"\\\",\\\"3209\\\":\\\"3\\\",\\\"3210\\\":\\\"2\\\",\\\"3211\\\":\\\"9\\\",\\\"3212\\\":\\\"\\\\\\\"\\\",\\\"3213\\\":\\\":\\\",\\\"3214\\\":\\\"\\\\\\\"\\\",\\\"3215\\\":\\\"n\\\",\\\"3216\\\":\\\"\\\\\\\"\\\",\\\"3217\\\":\\\",\\\",\\\"3218\\\":\\\"\\\\\\\"\\\",\\\"3219\\\":\\\"3\\\",\\\"3220\\\":\\\"3\\\",\\\"3221\\\":\\\"0\\\",\\\"3222\\\":\\\"\\\\\\\"\\\",\\\"3223\\\":\\\":\\\",\\\"3224\\\":\\\"\\\\\\\"\\\",\\\"3225\\\":\\\"i\\\",\\\"3226\\\":\\\"\\\\\\\"\\\",\\\"3227\\\":\\\",\\\",\\\"3228\\\":\\\"\\\\\\\"\\\",\\\"3229\\\":\\\"3\\\",\\\"3230\\\":\\\"3\\\",\\\"3231\\\":\\\"1\\\",\\\"3232\\\":\\\"\\\\\\\"\\\",\\\"3233\\\":\\\":\\\",\\\"3234\\\":\\\"\\\\\\\"\\\",\\\"3235\\\":\\\"n\\\",\\\"3236\\\":\\\"\\\\\\\"\\\",\\\"3237\\\":\\\",\\\",\\\"3238\\\":\\\"\\\\\\\"\\\",\\\"3239\\\":\\\"3\\\",\\\"3240\\\":\\\"3\\\",\\\"3241\\\":\\\"2\\\",\\\"3242\\\":\\\"\\\\\\\"\\\",\\\"3243\\\":\\\":\\\",\\\"3244\\\":\\\"\\\\\\\"\\\",\\\"3245\\\":\\\"g\\\",\\\"3246\\\":\\\"\\\\\\\"\\\",\\\"3247\\\":\\\",\\\",\\\"3248\\\":\\\"\\\\\\\"\\\",\\\"3249\\\":\\\"3\\\",\\\"3250\\\":\\\"3\\\",\\\"3251\\\":\\\"3\\\",\\\"3252\\\":\\\"\\\\\\\"\\\",\\\"3253\\\":\\\":\\\",\\\"3254\\\":\\\"\\\\\\\"\\\",\\\"3255\\\":\\\"\\\\\\\\\\\",\\\"3256\\\":\\\"\\\\\\\"\\\",\\\"3257\\\":\\\"\\\\\\\"\\\",\\\"3258\\\":\\\",\\\",\\\"3259\\\":\\\"\\\\\\\"\\\",\\\"3260\\\":\\\"3\\\",\\\"3261\\\":\\\"3\\\",\\\"3262\\\":\\\"4\\\",\\\"3263\\\":\\\"\\\\\\\"\\\",\\\"3264\\\":\\\":\\\",\\\"3265\\\":\\\"\\\\\\\"\\\",\\\"3266\\\":\\\":\\\",\\\"3267\\\":\\\"\\\\\\\"\\\",\\\"3268\\\":\\\",\\\",\\\"3269\\\":\\\"\\\\\\\"\\\",\\\"3270\\\":\\\"3\\\",\\\"3271\\\":\\\"3\\\",\\\"3272\\\":\\\"5\\\",\\\"3273\\\":\\\"\\\\\\\"\\\",\\\"3274\\\":\\\":\\\",\\\"3275\\\":\\\"\\\\\\\"\\\",\\\"3276\\\":\\\"n\\\",\\\"3277\\\":\\\"\\\\\\\"\\\",\\\"3278\\\":\\\",\\\",\\\"3279\\\":\\\"\\\\\\\"\\\",\\\"3280\\\":\\\"3\\\",\\\"3281\\\":\\\"3\\\",\\\"3282\\\":\\\"6\\\",\\\"3283\\\":\\\"\\\\\\\"\\\",\\\"3284\\\":\\\":\\\",\\\"3285\\\":\\\"\\\\\\\"\\\",\\\"3286\\\":\\\"u\\\",\\\"3287\\\":\\\"\\\\\\\"\\\",\\\"3288\\\":\\\",\\\",\\\"3289\\\":\\\"\\\\\\\"\\\",\\\"3290\\\":\\\"3\\\",\\\"3291\\\":\\\"3\\\",\\\"3292\\\":\\\"7\\\",\\\"3293\\\":\\\"\\\\\\\"\\\",\\\"3294\\\":\\\":\\\",\\\"3295\\\":\\\"\\\\\\\"\\\",\\\"3296\\\":\\\"l\\\",\\\"3297\\\":\\\"\\\\\\\"\\\",\\\"3298\\\":\\\",\\\",\\\"3299\\\":\\\"\\\\\\\"\\\",\\\"3300\\\":\\\"3\\\",\\\"3301\\\":\\\"3\\\",\\\"3302\\\":\\\"8\\\",\\\"3303\\\":\\\"\\\\\\\"\\\",\\\"3304\\\":\\\":\\\",\\\"3305\\\":\\\"\\\\\\\"\\\",\\\"3306\\\":\\\"l\\\",\\\"3307\\\":\\\"\\\\\\\"\\\",\\\"3308\\\":\\\",\\\",\\\"3309\\\":\\\"\\\\\\\"\\\",\\\"3310\\\":\\\"3\\\",\\\"3311\\\":\\\"3\\\",\\\"3312\\\":\\\"9\\\",\\\"3313\\\":\\\"\\\\\\\"\\\",\\\"3314\\\":\\\":\\\",\\\"3315\\\":\\\"\\\\\\\"\\\",\\\"3316\\\":\\\"}\\\",\\\"3317\\\":\\\"\\\\\\\"\\\",\\\"3318\\\":\\\",\\\",\\\"3319\\\":\\\"\\\\\\\"\\\",\\\"3320\\\":\\\"p\\\",\\\"3321\\\":\\\"a\\\",\\\"3322\\\":\\\"y\\\",\\\"3323\\\":\\\"m\\\",\\\"3324\\\":\\\"e\\\",\\\"3325\\\":\\\"n\\\",\\\"3326\\\":\\\"t\\\",\\\"3327\\\":\\\"_\\\",\\\"3328\\\":\\\"f\\\",\\\"3329\\\":\\\"a\\\",\\\"3330\\\":\\\"i\\\",\\\"3331\\\":\\\"l\\\",\\\"3332\\\":\\\"e\\\",\\\"3333\\\":\\\"d\\\",\\\"3334\\\":\\\"_\\\",\\\"3335\\\":\\\"a\\\",\\\"3336\\\":\\\"t\\\",\\\"3337\\\":\\\"\\\\\\\"\\\",\\\"3338\\\":\\\":\\\",\\\"3339\\\":\\\"\\\\\\\"\\\",\\\"3340\\\":\\\"2\\\",\\\"3341\\\":\\\"0\\\",\\\"3342\\\":\\\"2\\\",\\\"3343\\\":\\\"6\\\",\\\"3344\\\":\\\"-\\\",\\\"3345\\\":\\\"0\\\",\\\"3346\\\":\\\"1\\\",\\\"3347\\\":\\\"-\\\",\\\"3348\\\":\\\"3\\\",\\\"3349\\\":\\\"1\\\",\\\"3350\\\":\\\"T\\\",\\\"3351\\\":\\\"0\\\",\\\"3352\\\":\\\"9\\\",\\\"3353\\\":\\\":\\\",\\\"3354\\\":\\\"4\\\",\\\"3355\\\":\\\"0\\\",\\\"3356\\\":\\\":\\\",\\\"3357\\\":\\\"1\\\",\\\"3358\\\":\\\"1\\\",\\\"3359\\\":\\\".\\\",\\\"3360\\\":\\\"6\\\",\\\"3361\\\":\\\"4\\\",\\\"3362\\\":\\\"1\\\",\\\"3363\\\":\\\"Z\\\",\\\"3364\\\":\\\"\\\\\\\"\\\",\\\"3365\\\":\\\",\\\",\\\"3366\\\":\\\"\\\\\\\"\\\",\\\"3367\\\":\\\"f\\\",\\\"3368\\\":\\\"a\\\",\\\"3369\\\":\\\"i\\\",\\\"3370\\\":\\\"l\\\",\\\"3371\\\":\\\"u\\\",\\\"3372\\\":\\\"r\\\",\\\"3373\\\":\\\"e\\\",\\\"3374\\\":\\\"_\\\",\\\"3375\\\":\\\"r\\\",\\\"3376\\\":\\\"e\\\",\\\"3377\\\":\\\"a\\\",\\\"3378\\\":\\\"s\\\",\\\"3379\\\":\\\"o\\\",\\\"3380\\\":\\\"n\\\",\\\"3381\\\":\\\"\\\\\\\"\\\",\\\"3382\\\":\\\":\\\",\\\"3383\\\":\\\"\\\\\\\"\\\",\\\"3384\\\":\\\"N\\\",\\\"3385\\\":\\\"A\\\",\\\"3386\\\":\\\"\\\\\\\"\\\",\\\"3387\\\":\\\",\\\",\\\"3388\\\":\\\"\\\\\\\"\\\",\\\"3389\\\":\\\"e\\\",\\\"3390\\\":\\\"a\\\",\\\"3391\\\":\\\"s\\\",\\\"3392\\\":\\\"e\\\",\\\"3393\\\":\\\"p\\\",\\\"3394\\\":\\\"a\\\",\\\"3395\\\":\\\"y\\\",\\\"3396\\\":\\\"i\\\",\\\"3397\\\":\\\"d\\\",\\\"3398\\\":\\\"\\\\\\\"\\\",\\\"3399\\\":\\\":\\\",\\\"3400\\\":\\\"\\\\\\\"\\\",\\\"3401\\\":\\\"S\\\",\\\"3402\\\":\\\"2\\\",\\\"3403\\\":\\\"6\\\",\\\"3404\\\":\\\"0\\\",\\\"3405\\\":\\\"1\\\",\\\"3406\\\":\\\"3\\\",\\\"3407\\\":\\\"1\\\",\\\"3408\\\":\\\"0\\\",\\\"3409\\\":\\\"7\\\",\\\"3410\\\":\\\"4\\\",\\\"3411\\\":\\\"J\\\",\\\"3412\\\":\\\"5\\\",\\\"3413\\\":\\\"D\\\",\\\"3414\\\":\\\"A\\\",\\\"3415\\\":\\\"\\\\\\\"\\\",\\\"3416\\\":\\\",\\\",\\\"3417\\\":\\\"\\\\\\\"\\\",\\\"3418\\\":\\\"b\\\",\\\"3419\\\":\\\"a\\\",\\\"3420\\\":\\\"n\\\",\\\"3421\\\":\\\"k\\\",\\\"3422\\\":\\\"_\\\",\\\"3423\\\":\\\"r\\\",\\\"3424\\\":\\\"e\\\",\\\"3425\\\":\\\"f\\\",\\\"3426\\\":\\\"_\\\",\\\"3427\\\":\\\"n\\\",\\\"3428\\\":\\\"u\\\",\\\"3429\\\":\\\"m\\\",\\\"3430\\\":\\\"\\\\\\\"\\\",\\\"3431\\\":\\\":\\\",\\\"3432\\\":\\\"\\\\\\\"\\\",\\\"3433\\\":\\\"N\\\",\\\"3434\\\":\\\"A\\\",\\\"3435\\\":\\\"\\\\\\\"\\\",\\\"3436\\\":\\\",\\\",\\\"3437\\\":\\\"\\\\\\\"\\\",\\\"3438\\\":\\\"w\\\",\\\"3439\\\":\\\"e\\\",\\\"3440\\\":\\\"b\\\",\\\"3441\\\":\\\"h\\\",\\\"3442\\\":\\\"o\\\",\\\"3443\\\":\\\"o\\\",\\\"3444\\\":\\\"k\\\",\\\"3445\\\":\\\"_\\\",\\\"3446\\\":\\\"r\\\",\\\"3447\\\":\\\"e\\\",\\\"3448\\\":\\\"c\\\",\\\"3449\\\":\\\"e\\\",\\\"3450\\\":\\\"i\\\",\\\"3451\\\":\\\"v\\\",\\\"3452\\\":\\\"e\\\",\\\"3453\\\":\\\"d\\\",\\\"3454\\\":\\\"_\\\",\\\"3455\\\":\\\"a\\\",\\\"3456\\\":\\\"t\\\",\\\"3457\\\":\\\"\\\\\\\"\\\",\\\"3458\\\":\\\":\\\",\\\"3459\\\":\\\"\\\\\\\"\\\",\\\"3460\\\":\\\"2\\\",\\\"3461\\\":\\\"0\\\",\\\"3462\\\":\\\"2\\\",\\\"3463\\\":\\\"6\\\",\\\"3464\\\":\\\"-\\\",\\\"3465\\\":\\\"0\\\",\\\"3466\\\":\\\"1\\\",\\\"3467\\\":\\\"-\\\",\\\"3468\\\":\\\"3\\\",\\\"3469\\\":\\\"1\\\",\\\"3470\\\":\\\"T\\\",\\\"3471\\\":\\\"0\\\",\\\"3472\\\":\\\"9\\\",\\\"3473\\\":\\\":\\\",\\\"3474\\\":\\\"4\\\",\\\"3475\\\":\\\"0\\\",\\\"3476\\\":\\\":\\\",\\\"3477\\\":\\\"1\\\",\\\"3478\\\":\\\"1\\\",\\\"3479\\\":\\\".\\\",\\\"3480\\\":\\\"6\\\",\\\"3481\\\":\\\"4\\\",\\\"3482\\\":\\\"1\\\",\\\"3483\\\":\\\"Z\\\",\\\"3484\\\":\\\"\\\\\\\"\\\",\\\"3485\\\":\\\"}\\\",\\\"payment_failed_at\\\":\\\"2026-01-31T09:40:12.488Z\\\",\\\"failure_reason\\\":\\\"NA\\\",\\\"easepayid\\\":\\\"S260131074J5DA\\\",\\\"bank_ref_num\\\":\\\"NA\\\",\\\"webhook_received_at\\\":\\\"2026-01-31T09:40:12.488Z\\\"}\"', '2026-01-31 15:06:55', '2026-01-31 15:10:12');
INSERT INTO `driver_subscriptions` (`id`, `driver_id`, `plan_id`, `transaction_id`, `subscription_number`, `start_date`, `end_date`, `rides_remaining`, `rides_used`, `total_rides`, `amount_paid`, `payment_status`, `payment_method`, `payment_gateway`, `gateway_transaction_id`, `gateway_payment_id`, `gateway_order_id`, `status`, `auto_renew`, `cancelled_at`, `cancellation_reason`, `metadata`, `created_at`, `updated_at`) VALUES
(6, 50, 2, 'SUB_53d38304_1d05_42', 'SUBSC-1769853138160-50', '2026-01-31 15:22:18', '2026-03-02 15:22:18', NULL, 0, NULL, 999.00, 'completed', 'easebuzz', 'easebuzz', 'S260131074J5EG', 'S260131074J5EG', 'SUB_53d38304_1d05_42', 'active', 0, NULL, NULL, '\"{\\\"0\\\":\\\"{\\\",\\\"1\\\":\\\"\\\\\\\"\\\",\\\"2\\\":\\\"p\\\",\\\"3\\\":\\\"l\\\",\\\"4\\\":\\\"a\\\",\\\"5\\\":\\\"n\\\",\\\"6\\\":\\\"_\\\",\\\"7\\\":\\\"n\\\",\\\"8\\\":\\\"a\\\",\\\"9\\\":\\\"m\\\",\\\"10\\\":\\\"e\\\",\\\"11\\\":\\\"\\\\\\\"\\\",\\\"12\\\":\\\":\\\",\\\"13\\\":\\\"\\\\\\\"\\\",\\\"14\\\":\\\"S\\\",\\\"15\\\":\\\"t\\\",\\\"16\\\":\\\"a\\\",\\\"17\\\":\\\"n\\\",\\\"18\\\":\\\"d\\\",\\\"19\\\":\\\"a\\\",\\\"20\\\":\\\"r\\\",\\\"21\\\":\\\"d\\\",\\\"22\\\":\\\" \\\",\\\"23\\\":\\\"-\\\",\\\"24\\\":\\\" \\\",\\\"25\\\":\\\"3\\\",\\\"26\\\":\\\"0\\\",\\\"27\\\":\\\" \\\",\\\"28\\\":\\\"D\\\",\\\"29\\\":\\\"a\\\",\\\"30\\\":\\\"y\\\",\\\"31\\\":\\\"s\\\",\\\"32\\\":\\\"\\\\\\\"\\\",\\\"33\\\":\\\",\\\",\\\"34\\\":\\\"\\\\\\\"\\\",\\\"35\\\":\\\"p\\\",\\\"36\\\":\\\"l\\\",\\\"37\\\":\\\"a\\\",\\\"38\\\":\\\"n\\\",\\\"39\\\":\\\"_\\\",\\\"40\\\":\\\"d\\\",\\\"41\\\":\\\"e\\\",\\\"42\\\":\\\"s\\\",\\\"43\\\":\\\"c\\\",\\\"44\\\":\\\"r\\\",\\\"45\\\":\\\"i\\\",\\\"46\\\":\\\"p\\\",\\\"47\\\":\\\"t\\\",\\\"48\\\":\\\"i\\\",\\\"49\\\":\\\"o\\\",\\\"50\\\":\\\"n\\\",\\\"51\\\":\\\"\\\\\\\"\\\",\\\"52\\\":\\\":\\\",\\\"53\\\":\\\"\\\\\\\"\\\",\\\"54\\\":\\\"Z\\\",\\\"55\\\":\\\"e\\\",\\\"56\\\":\\\"r\\\",\\\"57\\\":\\\"o\\\",\\\"58\\\":\\\" \\\",\\\"59\\\":\\\"c\\\",\\\"60\\\":\\\"o\\\",\\\"61\\\":\\\"m\\\",\\\"62\\\":\\\"m\\\",\\\"63\\\":\\\"i\\\",\\\"64\\\":\\\"s\\\",\\\"65\\\":\\\"s\\\",\\\"66\\\":\\\"i\\\",\\\"67\\\":\\\"o\\\",\\\"68\\\":\\\"n\\\",\\\"69\\\":\\\" \\\",\\\"70\\\":\\\"f\\\",\\\"71\\\":\\\"o\\\",\\\"72\\\":\\\"r\\\",\\\"73\\\":\\\" \\\",\\\"74\\\":\\\"3\\\",\\\"75\\\":\\\"0\\\",\\\"76\\\":\\\" \\\",\\\"77\\\":\\\"d\\\",\\\"78\\\":\\\"a\\\",\\\"79\\\":\\\"y\\\",\\\"80\\\":\\\"s\\\",\\\"81\\\":\\\"\\\\\\\"\\\",\\\"82\\\":\\\",\\\",\\\"83\\\":\\\"\\\\\\\"\\\",\\\"84\\\":\\\"c\\\",\\\"85\\\":\\\"o\\\",\\\"86\\\":\\\"m\\\",\\\"87\\\":\\\"m\\\",\\\"88\\\":\\\"i\\\",\\\"89\\\":\\\"s\\\",\\\"90\\\":\\\"s\\\",\\\"91\\\":\\\"i\\\",\\\"92\\\":\\\"o\\\",\\\"93\\\":\\\"n\\\",\\\"94\\\":\\\"_\\\",\\\"95\\\":\\\"w\\\",\\\"96\\\":\\\"a\\\",\\\"97\\\":\\\"i\\\",\\\"98\\\":\\\"v\\\",\\\"99\\\":\\\"e\\\",\\\"100\\\":\\\"r\\\",\\\"101\\\":\\\"\\\\\\\"\\\",\\\"102\\\":\\\":\\\",\\\"103\\\":\\\"t\\\",\\\"104\\\":\\\"r\\\",\\\"105\\\":\\\"u\\\",\\\"106\\\":\\\"e\\\",\\\"107\\\":\\\",\\\",\\\"108\\\":\\\"\\\\\\\"\\\",\\\"109\\\":\\\"m\\\",\\\"110\\\":\\\"a\\\",\\\"111\\\":\\\"x\\\",\\\"112\\\":\\\"_\\\",\\\"113\\\":\\\"d\\\",\\\"114\\\":\\\"a\\\",\\\"115\\\":\\\"i\\\",\\\"116\\\":\\\"l\\\",\\\"117\\\":\\\"y\\\",\\\"118\\\":\\\"_\\\",\\\"119\\\":\\\"r\\\",\\\"120\\\":\\\"i\\\",\\\"121\\\":\\\"d\\\",\\\"122\\\":\\\"e\\\",\\\"123\\\":\\\"s\\\",\\\"124\\\":\\\"\\\\\\\"\\\",\\\"125\\\":\\\":\\\",\\\"126\\\":\\\"n\\\",\\\"127\\\":\\\"u\\\",\\\"128\\\":\\\"l\\\",\\\"129\\\":\\\"l\\\",\\\"130\\\":\\\",\\\",\\\"131\\\":\\\"\\\\\\\"\\\",\\\"132\\\":\\\"i\\\",\\\"133\\\":\\\"n\\\",\\\"134\\\":\\\"i\\\",\\\"135\\\":\\\"t\\\",\\\"136\\\":\\\"i\\\",\\\"137\\\":\\\"a\\\",\\\"138\\\":\\\"t\\\",\\\"139\\\":\\\"e\\\",\\\"140\\\":\\\"d\\\",\\\"141\\\":\\\"_\\\",\\\"142\\\":\\\"a\\\",\\\"143\\\":\\\"t\\\",\\\"144\\\":\\\"\\\\\\\"\\\",\\\"145\\\":\\\":\\\",\\\"146\\\":\\\"\\\\\\\"\\\",\\\"147\\\":\\\"2\\\",\\\"148\\\":\\\"0\\\",\\\"149\\\":\\\"2\\\",\\\"150\\\":\\\"6\\\",\\\"151\\\":\\\"-\\\",\\\"152\\\":\\\"0\\\",\\\"153\\\":\\\"1\\\",\\\"154\\\":\\\"-\\\",\\\"155\\\":\\\"3\\\",\\\"156\\\":\\\"1\\\",\\\"157\\\":\\\"T\\\",\\\"158\\\":\\\"0\\\",\\\"159\\\":\\\"9\\\",\\\"160\\\":\\\":\\\",\\\"161\\\":\\\"5\\\",\\\"162\\\":\\\"2\\\",\\\"163\\\":\\\":\\\",\\\"164\\\":\\\"1\\\",\\\"165\\\":\\\"8\\\",\\\"166\\\":\\\".\\\",\\\"167\\\":\\\"1\\\",\\\"168\\\":\\\"6\\\",\\\"169\\\":\\\"0\\\",\\\"170\\\":\\\"Z\\\",\\\"171\\\":\\\"\\\\\\\"\\\",\\\"172\\\":\\\",\\\",\\\"173\\\":\\\"\\\\\\\"\\\",\\\"174\\\":\\\"u\\\",\\\"175\\\":\\\"s\\\",\\\"176\\\":\\\"e\\\",\\\"177\\\":\\\"r\\\",\\\"178\\\":\\\"_\\\",\\\"179\\\":\\\"a\\\",\\\"180\\\":\\\"g\\\",\\\"181\\\":\\\"e\\\",\\\"182\\\":\\\"n\\\",\\\"183\\\":\\\"t\\\",\\\"184\\\":\\\"\\\\\\\"\\\",\\\"185\\\":\\\":\\\",\\\"186\\\":\\\"\\\\\\\"\\\",\\\"187\\\":\\\"D\\\",\\\"188\\\":\\\"a\\\",\\\"189\\\":\\\"r\\\",\\\"190\\\":\\\"t\\\",\\\"191\\\":\\\"/\\\",\\\"192\\\":\\\"3\\\",\\\"193\\\":\\\".\\\",\\\"194\\\":\\\"1\\\",\\\"195\\\":\\\"0\\\",\\\"196\\\":\\\" \\\",\\\"197\\\":\\\"(\\\",\\\"198\\\":\\\"d\\\",\\\"199\\\":\\\"a\\\",\\\"200\\\":\\\"r\\\",\\\"201\\\":\\\"t\\\",\\\"202\\\":\\\":\\\",\\\"203\\\":\\\"i\\\",\\\"204\\\":\\\"o\\\",\\\"205\\\":\\\")\\\",\\\"206\\\":\\\"\\\\\\\"\\\",\\\"207\\\":\\\",\\\",\\\"208\\\":\\\"\\\\\\\"\\\",\\\"209\\\":\\\"i\\\",\\\"210\\\":\\\"s\\\",\\\"211\\\":\\\"_\\\",\\\"212\\\":\\\"q\\\",\\\"213\\\":\\\"u\\\",\\\"214\\\":\\\"e\\\",\\\"215\\\":\\\"u\\\",\\\"216\\\":\\\"e\\\",\\\"217\\\":\\\"d\\\",\\\"218\\\":\\\"\\\\\\\"\\\",\\\"219\\\":\\\":\\\",\\\"220\\\":\\\"f\\\",\\\"221\\\":\\\"a\\\",\\\"222\\\":\\\"l\\\",\\\"223\\\":\\\"s\\\",\\\"224\\\":\\\"e\\\",\\\"225\\\":\\\",\\\",\\\"226\\\":\\\"\\\\\\\"\\\",\\\"227\\\":\\\"q\\\",\\\"228\\\":\\\"u\\\",\\\"229\\\":\\\"e\\\",\\\"230\\\":\\\"u\\\",\\\"231\\\":\\\"e\\\",\\\"232\\\":\\\"d\\\",\\\"233\\\":\\\"_\\\",\\\"234\\\":\\\"a\\\",\\\"235\\\":\\\"f\\\",\\\"236\\\":\\\"t\\\",\\\"237\\\":\\\"e\\\",\\\"238\\\":\\\"r\\\",\\\"239\\\":\\\"_\\\",\\\"240\\\":\\\"s\\\",\\\"241\\\":\\\"u\\\",\\\"242\\\":\\\"b\\\",\\\"243\\\":\\\"s\\\",\\\"244\\\":\\\"c\\\",\\\"245\\\":\\\"r\\\",\\\"246\\\":\\\"i\\\",\\\"247\\\":\\\"p\\\",\\\"248\\\":\\\"t\\\",\\\"249\\\":\\\"i\\\",\\\"250\\\":\\\"o\\\",\\\"251\\\":\\\"n\\\",\\\"252\\\":\\\"\\\\\\\"\\\",\\\"253\\\":\\\":\\\",\\\"254\\\":\\\"n\\\",\\\"255\\\":\\\"u\\\",\\\"256\\\":\\\"l\\\",\\\"257\\\":\\\"l\\\",\\\"258\\\":\\\",\\\",\\\"259\\\":\\\"\\\\\\\"\\\",\\\"260\\\":\\\"c\\\",\\\"261\\\":\\\"u\\\",\\\"262\\\":\\\"r\\\",\\\"263\\\":\\\"r\\\",\\\"264\\\":\\\"e\\\",\\\"265\\\":\\\"n\\\",\\\"266\\\":\\\"t\\\",\\\"267\\\":\\\"_\\\",\\\"268\\\":\\\"s\\\",\\\"269\\\":\\\"u\\\",\\\"270\\\":\\\"b\\\",\\\"271\\\":\\\"s\\\",\\\"272\\\":\\\"c\\\",\\\"273\\\":\\\"r\\\",\\\"274\\\":\\\"i\\\",\\\"275\\\":\\\"p\\\",\\\"276\\\":\\\"t\\\",\\\"277\\\":\\\"i\\\",\\\"278\\\":\\\"o\\\",\\\"279\\\":\\\"n\\\",\\\"280\\\":\\\"_\\\",\\\"281\\\":\\\"e\\\",\\\"282\\\":\\\"n\\\",\\\"283\\\":\\\"d\\\",\\\"284\\\":\\\"_\\\",\\\"285\\\":\\\"d\\\",\\\"286\\\":\\\"a\\\",\\\"287\\\":\\\"t\\\",\\\"288\\\":\\\"e\\\",\\\"289\\\":\\\"\\\\\\\"\\\",\\\"290\\\":\\\":\\\",\\\"291\\\":\\\"n\\\",\\\"292\\\":\\\"u\\\",\\\"293\\\":\\\"l\\\",\\\"294\\\":\\\"l\\\",\\\"295\\\":\\\",\\\",\\\"296\\\":\\\"\\\\\\\"\\\",\\\"297\\\":\\\"c\\\",\\\"298\\\":\\\"u\\\",\\\"299\\\":\\\"r\\\",\\\"300\\\":\\\"r\\\",\\\"301\\\":\\\"e\\\",\\\"302\\\":\\\"n\\\",\\\"303\\\":\\\"t\\\",\\\"304\\\":\\\"_\\\",\\\"305\\\":\\\"s\\\",\\\"306\\\":\\\"u\\\",\\\"307\\\":\\\"b\\\",\\\"308\\\":\\\"s\\\",\\\"309\\\":\\\"c\\\",\\\"310\\\":\\\"r\\\",\\\"311\\\":\\\"i\\\",\\\"312\\\":\\\"p\\\",\\\"313\\\":\\\"t\\\",\\\"314\\\":\\\"i\\\",\\\"315\\\":\\\"o\\\",\\\"316\\\":\\\"n\\\",\\\"317\\\":\\\"_\\\",\\\"318\\\":\\\"r\\\",\\\"319\\\":\\\"i\\\",\\\"320\\\":\\\"d\\\",\\\"321\\\":\\\"e\\\",\\\"322\\\":\\\"s\\\",\\\"323\\\":\\\"_\\\",\\\"324\\\":\\\"r\\\",\\\"325\\\":\\\"e\\\",\\\"326\\\":\\\"m\\\",\\\"327\\\":\\\"a\\\",\\\"328\\\":\\\"i\\\",\\\"329\\\":\\\"n\\\",\\\"330\\\":\\\"i\\\",\\\"331\\\":\\\"n\\\",\\\"332\\\":\\\"g\\\",\\\"333\\\":\\\"\\\\\\\"\\\",\\\"334\\\":\\\":\\\",\\\"335\\\":\\\"n\\\",\\\"336\\\":\\\"u\\\",\\\"337\\\":\\\"l\\\",\\\"338\\\":\\\"l\\\",\\\"339\\\":\\\"}\\\",\\\"payment_completed_at\\\":\\\"2026-01-31T09:53:14.523Z\\\",\\\"easepayid\\\":\\\"S260131074J5EG\\\",\\\"bank_ref_num\\\":\\\"498110084482\\\",\\\"webhook_received_at\\\":\\\"2026-01-31T09:53:14.523Z\\\"}\"', '2026-01-31 15:22:18', '2026-01-31 15:23:14');

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `id` int NOT NULL,
  `rating` int NOT NULL,
  `feedback` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `status` int DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `feedback`
--

INSERT INTO `feedback` (`id`, `rating`, `feedback`, `status`, `created_at`, `updated_at`) VALUES
(2, 1, 'Misbehave', 1, '2025-11-17 19:20:47', '2025-11-17 19:20:47'),
(4, 5, 'Good ride', 1, '2025-12-18 16:35:34', '2025-12-18 16:35:34'),
(5, 5, 'Good ride', 1, '2025-12-19 16:32:04', '2025-12-19 16:32:04'),
(6, 4, 'Good ride', 1, '2025-12-20 13:34:15', '2025-12-20 13:34:15');

-- --------------------------------------------------------

--
-- Table structure for table `licenses`
--

CREATE TABLE `licenses` (
  `id` int NOT NULL,
  `license_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Format: LIC-IND-2025-0001',
  `client_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `domain` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `server_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan` enum('lifetime','monthly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'lifetime',
  `expiry_on` date DEFAULT NULL COMMENT 'Only required for monthly/yearly plans. NULL for lifetime',
  `status` enum('active','suspended','terminated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `last_ping` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `licenses`
--

INSERT INTO `licenses` (`id`, `license_id`, `client_name`, `company_name`, `domain`, `server_ip`, `plan`, `expiry_on`, `status`, `last_ping`, `created_at`, `updated_at`) VALUES
(1, 'LIC-IND-2025-0001', 'Sowvik', 'Nefacabs', 'https://admin.nefacabs.com/', '82.112.227.161', 'lifetime', NULL, 'active', '2026-01-30 17:28:55', '2025-12-17 16:25:10', '2026-01-30 17:28:55'),
(2, 'LIC-IND-2025-0002', 'Arun Gumte', 'BozzoCabs', 'https://admin.bozzocab.com/', '72.61.228.212', 'lifetime', NULL, 'active', NULL, '2025-12-17 16:27:56', '2025-12-17 16:27:56');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `body` text COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'general',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `read_status` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `otp`
--

CREATE TABLE `otp` (
  `id` int NOT NULL,
  `mobile` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `otp` varchar(6) COLLATE utf8mb4_general_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `verified` tinyint(1) DEFAULT '0',
  `attempts` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `otp`
--

INSERT INTO `otp` (`id`, `mobile`, `otp`, `expires_at`, `verified`, `attempts`, `created_at`, `updated_at`) VALUES
(2, '6381455279', '883741', '2025-12-29 11:34:15', 0, 0, '2025-12-29 11:29:15', '2025-12-29 11:29:15'),
(3, '9918821973', '475781', '2025-12-29 11:40:17', 1, 0, '2025-12-29 11:35:17', '2025-12-29 12:38:01'),
(4, '9918821973', '580763', '2025-12-29 11:50:10', 1, 0, '2025-12-29 11:45:10', '2025-12-29 12:38:01'),
(5, '9918821973', '926362', '2025-12-29 12:05:00', 1, 0, '2025-12-29 12:00:00', '2025-12-29 12:38:01'),
(6, '9918821973', '312772', '2025-12-29 12:35:25', 1, 0, '2025-12-29 12:30:25', '2025-12-29 12:38:01'),
(7, '9918821973', '728106', '2025-12-29 12:43:01', 0, 1, '2025-12-29 12:38:01', '2025-12-29 13:06:35'),
(8, '9918821973', '761174', '2025-12-29 13:12:06', 1, 0, '2025-12-29 13:07:06', '2025-12-29 13:07:27'),
(9, '9918821973', '558190', '2025-12-29 13:13:37', 1, 0, '2025-12-29 13:08:37', '2025-12-29 13:11:18'),
(10, '7905184978', '446057', '2025-12-29 15:54:31', 1, 0, '2025-12-29 15:49:31', '2025-12-29 17:04:30'),
(11, '7905184978', '404084', '2025-12-29 17:08:15', 1, 0, '2025-12-29 17:03:15', '2025-12-29 17:04:30'),
(12, '7905184978', '262559', '2025-12-29 17:09:30', 0, 0, '2025-12-29 17:04:30', '2025-12-29 17:04:30'),
(13, '9811111111', '666616', '2026-01-02 23:46:21', 0, 0, '2026-01-02 23:41:21', '2026-01-02 23:41:21'),
(14, '9811111111', '615381', '2026-01-05 11:00:19', 0, 1, '2026-01-05 10:55:19', '2026-01-05 10:55:27'),
(15, '7502558479', '452043', '2026-01-09 13:18:04', 1, 0, '2026-01-09 13:13:04', '2026-01-09 13:13:34'),
(16, '9918821973', '439258', '2026-01-09 22:13:53', 0, 0, '2026-01-09 22:08:53', '2026-01-09 22:08:53'),
(17, '7905184978', '153226', '2026-01-09 23:07:11', 0, 0, '2026-01-09 23:02:11', '2026-01-09 23:02:11'),
(18, '7905184978', '465242', '2026-01-09 23:11:49', 0, 0, '2026-01-09 23:06:49', '2026-01-09 23:06:49'),
(19, '7905184978', '384031', '2026-01-09 23:41:27', 0, 0, '2026-01-09 23:36:27', '2026-01-09 23:36:27'),
(20, '7905184978', '716578', '2026-01-09 23:59:19', 0, 0, '2026-01-09 23:54:19', '2026-01-09 23:54:19'),
(21, '9918821973', '806376', '2026-01-10 00:01:12', 0, 0, '2026-01-09 23:56:12', '2026-01-09 23:56:12'),
(22, '7905184978', '771829', '2026-01-10 00:05:04', 0, 0, '2026-01-10 00:00:04', '2026-01-10 00:00:04'),
(23, '7905184978', '480011', '2026-01-10 00:08:25', 0, 0, '2026-01-10 00:03:25', '2026-01-10 00:03:25'),
(24, '9918821973', '451264', '2026-01-10 00:10:18', 0, 0, '2026-01-10 00:05:18', '2026-01-10 00:05:18'),
(25, '7905184978', '143170', '2026-01-10 00:59:01', 0, 0, '2026-01-10 00:54:01', '2026-01-10 00:54:01'),
(26, '9918821973', '599499', '2026-01-10 00:59:20', 0, 0, '2026-01-10 00:54:20', '2026-01-10 00:54:20'),
(27, '9918821973', '454769', '2026-01-10 01:07:29', 1, 0, '2026-01-10 01:02:29', '2026-01-10 01:02:41'),
(28, '9918821973', '773391', '2026-01-10 01:26:59', 0, 1, '2026-01-10 01:22:00', '2026-01-10 10:23:21'),
(29, '9918821973', '291016', '2026-01-10 10:27:34', 1, 0, '2026-01-10 10:22:34', '2026-01-10 10:22:46'),
(30, '9918821973', '256378', '2026-01-10 10:38:58', 1, 0, '2026-01-10 10:33:58', '2026-01-10 10:34:11'),
(31, '9918821973', '883640', '2026-01-13 12:16:57', 1, 0, '2026-01-13 12:11:57', '2026-01-13 12:12:11'),
(32, '9918821973', '618801', '2026-01-23 15:18:35', 1, 0, '2026-01-23 15:13:35', '2026-01-23 15:13:50'),
(33, '9918821973', '167373', '2026-01-23 15:29:16', 1, 0, '2026-01-23 15:24:16', '2026-01-23 15:24:31'),
(34, '8105489311', '182915', '2026-01-23 15:35:05', 1, 0, '2026-01-23 15:30:05', '2026-01-23 15:30:19'),
(35, '8105489311', '551260', '2026-01-23 15:38:43', 1, 0, '2026-01-23 15:33:43', '2026-01-23 15:33:54'),
(36, '7905184978', '174065', '2026-01-24 12:16:30', 1, 0, '2026-01-24 12:11:30', '2026-01-24 12:11:42'),
(37, '7905184978', '336052', '2026-01-24 12:20:41', 1, 0, '2026-01-24 12:15:41', '2026-01-24 12:15:51'),
(38, '7905184978', '883134', '2026-01-24 13:26:41', 1, 0, '2026-01-24 13:21:41', '2026-01-24 13:21:53'),
(39, '9918821973', '589765', '2026-01-24 16:36:41', 1, 0, '2026-01-24 16:31:41', '2026-01-24 16:32:33'),
(40, '7905184978', '771843', '2026-01-24 17:08:19', 1, 0, '2026-01-24 17:03:19', '2026-01-24 17:03:31'),
(41, '9918821973', '727492', '2026-01-27 12:02:04', 1, 0, '2026-01-27 11:57:04', '2026-01-27 11:57:18'),
(42, '9360752727', '164505', '2026-01-30 22:56:58', 1, 0, '2026-01-30 22:51:58', '2026-01-30 22:52:03'),
(43, '9360752727', '572257', '2026-01-30 23:04:23', 1, 0, '2026-01-30 22:59:23', '2026-01-30 22:59:27'),
(44, '8358961669', '739859', '2026-01-31 15:10:24', 1, 0, '2026-01-31 15:05:24', '2026-01-31 15:05:37'),
(45, '8358961669', '231951', '2026-01-31 15:11:26', 1, 0, '2026-01-31 15:06:26', '2026-01-31 15:06:35'),
(46, '8358961669', '906200', '2026-01-31 17:03:17', 1, 0, '2026-01-31 16:58:18', '2026-01-31 16:58:27');

-- --------------------------------------------------------

--
-- Table structure for table `packages`
--

CREATE TABLE `packages` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `km` int NOT NULL,
  `advance` int NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `packages`
--

INSERT INTO `packages` (`id`, `name`, `km`, `advance`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Basic', 150, 20, 1, '2025-11-01 12:00:31', '2025-11-01 12:00:31'),
(2, 'standard', 200, 40, 1, '2025-11-01 12:00:46', '2025-11-01 12:00:46');

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint NOT NULL,
  `role_id` int NOT NULL,
  `module` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `can_add` tinyint(1) NOT NULL DEFAULT '0',
  `can_edit` tinyint(1) NOT NULL DEFAULT '0',
  `can_delete` tinyint(1) NOT NULL DEFAULT '0',
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `status` int NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `role_id`, `module`, `can_add`, `can_edit`, `can_delete`, `can_view`, `status`, `created_at`, `updated_at`) VALUES
(32, 1, 'trips', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-11-22 09:08:17'),
(33, 1, 'vehicles', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-11-22 09:08:17'),
(34, 1, 'settings', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-09-19 18:53:34'),
(35, 1, 'coupons', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-11-22 09:08:17'),
(36, 1, 'drivers', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-11-22 09:08:17'),
(37, 1, 'services', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-09-19 18:46:27'),
(38, 1, 'passenger', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-11-22 09:08:17'),
(39, 1, 'sos', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-09-19 18:46:27'),
(40, 1, 'team', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-09-19 18:46:27'),
(41, 6, 'riderequest', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-09-19 18:46:27'),
(42, 1, 'notification', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-09-19 18:46:27'),
(43, 1, 'feedback', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-11-22 09:08:17'),
(44, 6, 'permission', 1, 1, 1, 1, 1, '2025-09-19 18:46:27', '2025-09-19 18:46:27'),
(45, 6, 'settings', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(46, 6, 'trips', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(47, 6, 'vehicles', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-06 16:11:26'),
(48, 6, 'vehicletypes', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(49, 6, 'vehicleprices', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(50, 6, 'drivers', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(51, 6, 'coupons', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(52, 6, 'passenger', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(53, 6, 'services', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(54, 6, 'sos', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(55, 6, 'team', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(56, 6, 'notification', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(57, 6, 'riderequest', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(58, 6, 'feedback', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(59, 6, 'rankings', 1, 1, 1, 1, 1, '2025-10-04 18:47:25', '2025-10-04 18:47:25'),
(60, 6, 'role', 1, 1, 1, 1, 1, '2025-10-05 16:59:25', '2025-10-05 16:59:25'),
(61, 7, 'settings', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(62, 7, 'vehicles', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(63, 7, 'vehicleprices', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(64, 7, 'trips', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(65, 7, 'vehicletypes', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(66, 7, 'coupons', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(67, 7, 'passenger', 1, 1, 1, 1, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(68, 7, 'drivers', 1, 1, 1, 1, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(69, 7, 'services', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(70, 7, 'sos', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(71, 7, 'team', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(72, 7, 'notification', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(73, 7, 'riderequest', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(74, 7, 'feedback', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(75, 7, 'permission', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(76, 7, 'rankings', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(77, 7, 'role', 0, 0, 0, 0, 1, '2025-10-06 16:13:28', '2025-10-06 16:13:28'),
(78, 6, 'packages', 1, 1, 1, 1, 1, '2025-10-28 16:11:23', '2025-10-28 16:11:23'),
(79, 6, 'earnings', 1, 1, 1, 1, 1, '2025-11-03 15:49:26', '2025-11-03 15:49:26'),
(80, 6, 'reservation', 1, 1, 1, 1, 1, '2025-11-04 12:54:22', '2025-11-04 12:54:22'),
(81, 6, 'driverdeposit', 1, 1, 1, 1, 1, '2025-11-04 17:57:03', '2025-11-04 17:57:03'),
(82, 6, 'advancereservation', 1, 1, 1, 1, 1, '2025-11-04 17:57:03', '2025-11-04 17:57:03'),
(83, 6, 'deleterequest', 1, 1, 1, 1, 1, '2025-11-06 18:48:53', '2025-11-06 18:48:53'),
(84, 6, 'cancellationpolicy', 1, 1, 1, 1, 1, '2025-11-06 18:48:53', '2025-11-06 18:48:53'),
(85, 6, 'catcomplaints', 1, 1, 1, 1, 1, '2025-11-19 16:37:00', '2025-11-19 16:37:00'),
(86, 6, 'subcatcomplaints', 1, 1, 1, 1, 1, '2025-11-20 12:00:16', '2025-11-20 12:00:16'),
(87, 6, 'complaints', 1, 1, 1, 1, 1, '2025-11-20 15:48:59', '2025-11-20 15:48:59'),
(88, 1, 'vehicletypes', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(89, 1, 'vehicleprices', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(90, 1, 'riderequest', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(91, 1, 'rankings', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(92, 1, 'permission', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(93, 1, 'packages', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(94, 1, 'role', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(95, 1, 'earnings', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(96, 1, 'driverdeposit', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(97, 1, 'reservation', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(98, 1, 'advancereservation', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(99, 1, 'cancellationpolicy', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(100, 1, 'catcomplaints', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(101, 1, 'complaints', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(102, 1, 'subcatcomplaints', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(103, 1, 'deleterequest', 1, 1, 1, 1, 1, '2025-11-22 09:08:17', '2025-11-22 09:08:17'),
(104, 6, 'subscriptions', 1, 1, 1, 1, 1, '2025-12-13 17:16:36', '2025-12-13 17:16:36'),
(105, 6, 'mastersettings', 1, 1, 1, 1, 1, '2025-12-14 11:20:54', '2025-12-14 11:20:54'),
(106, 6, 'licensing', 1, 1, 1, 1, 1, '2025-12-18 12:17:54', '2025-12-18 12:17:54');

-- --------------------------------------------------------

--
-- Table structure for table `promo_codes`
--

CREATE TABLE `promo_codes` (
  `id` int NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `coupon_type` enum('general','firstride','referral','seasonal','targeted') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'general',
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `special_message` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `discount_type` enum('percentage','fixed') COLLATE utf8mb4_general_ci NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `max_discount` decimal(10,2) DEFAULT NULL,
  `min_order_value` decimal(10,2) DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `usage_limit` int DEFAULT NULL,
  `per_user_limit` int DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` int NOT NULL DEFAULT '1',
  `vehicle_type_restrictions` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `promo_codes`
--

INSERT INTO `promo_codes` (`id`, `code`, `coupon_type`, `description`, `special_message`, `discount_type`, `discount_value`, `max_discount`, `min_order_value`, `starts_at`, `expires_at`, `usage_limit`, `per_user_limit`, `created_at`, `updated_at`, `status`, `vehicle_type_restrictions`, `is_public`) VALUES
(1, 'SAVE100', 'general', NULL, NULL, 'fixed', 10.00, 50.00, 100.00, '2025-12-20 18:38:00', '2025-12-27 18:38:00', 10, 1, '2025-12-06 13:08:58', '2025-12-06 13:08:58', 1, '', 1);

-- --------------------------------------------------------

--
-- Table structure for table `promo_usages`
--

CREATE TABLE `promo_usages` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `promo_id` int NOT NULL,
  `ride_id` bigint NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `referrals`
--

CREATE TABLE `referrals` (
  `id` bigint NOT NULL,
  `referrer_id` bigint NOT NULL,
  `referred_id` bigint NOT NULL,
  `referral_code` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('pending','completed','expired') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `referrer_reward_id` int DEFAULT NULL,
  `referred_reward_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` int NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `refresh_tokens`
--

INSERT INTO `refresh_tokens` (`id`, `token`, `user_id`, `expires_at`, `created_at`, `updated_at`) VALUES
(116, '8e094d9c0bf31334a867e0554912779f14fe5a35f65cbb5e160184fd6532dd06f2ab64309eb7e446ee1c40fd125aab3be4df81a8f0481d585654882c740d9783', 40, '2025-12-18 16:23:51', '2025-12-11 16:23:51', '2025-12-11 16:23:51'),
(117, '9795abb4e561f10756e23bbc834bc9d6e17bdcef86efd4863c24ec3baf2bcfb6cc335f5b085db6ef8f1f9311404276694c98aa334a468d289b0130322b89f94f', 41, '2025-12-19 12:57:12', '2025-12-12 12:57:12', '2025-12-12 12:57:12'),
(118, '66eba85232b109d9560ee21b2b4467b0dcb74bba8395b16810c9297becb6064e762b5f6b6f2c3c7658696e4d739cffc5d77aaf72e172b33898cfe60049f56597', 1, '2025-12-19 13:52:44', '2025-12-12 13:52:44', '2025-12-12 13:52:44'),
(119, 'f773c7d379b4dbbd6d320ce9ed02d55541b08224cc32e76d2ee4ad3b48627c7779628a4e12b8e714adb474e3ae75a909c8f1b23ee6e0dbe70b2116a0f1a83498', 1, '2025-12-19 13:54:32', '2025-12-12 13:54:32', '2025-12-12 13:54:32'),
(120, '922c580b50a9abefc339ec4521f263d9391632d99b25ba7bb43ce0b1d1d60f26f50fccc8ec223f49abac75e41f005f48effbaa419f988155a70e89964553fb80', 1, '2025-12-19 13:55:24', '2025-12-12 13:55:24', '2025-12-12 13:55:24'),
(121, '6b778076183d9580677ae63f579ac5381dc9931f4dcd2e49cfeac072e1a0c66db87115e53c5182c6204df58784d50c84e636f1c01e2eb4b931318c813dcc737a', 1, '2025-12-19 13:59:29', '2025-12-12 13:59:29', '2025-12-12 13:59:29'),
(122, 'fd484e7b630538a8574ea2e8c0e3ccca14b7de3deb6de9f4cf0fac644102588cb2cfdbf73d6b2a5e08fd4cbfdf48701c98d2ab3e9ec8a1b694fc1e50ca44ba19', 41, '2025-12-19 14:09:37', '2025-12-12 14:09:37', '2025-12-12 14:09:37'),
(123, 'eba85c30073f9763e8b8df94d84b772b35c9aa448013ad4235dd60e113cfdc74f4ba570f0dd5bd9fef07bd9d2e082683aa9cc65308a3e8e374960466913ac1d5', 41, '2025-12-19 14:18:00', '2025-12-12 14:18:00', '2025-12-12 14:18:00'),
(124, 'e3b3497a553b16fd8212723fe68c033e0bee1b28b2a420887b151517e96868b1b0918e2022479b80b44bf923a4816a0c24b240dea46eeb6af26edf647a0402b7', 41, '2025-12-19 18:34:18', '2025-12-12 18:34:18', '2025-12-12 18:34:18'),
(125, '6d10ebfa1e8fc68dee5987cd9216b807bde0477286642f1c708a6148232b8ebca8ce609560e9f55a665fcfb1d2a4365cddc4f936f7101b30f2375c10aa896128', 1, '2025-12-21 09:55:36', '2025-12-14 09:55:36', '2025-12-14 09:55:36'),
(126, '853b39acc6be9d81d11af8f404a414af9062f33f575fa125b113ef380e7105ab34ffd60d9b3803b6e842f9cf02a472aaaba60547686c05b9890a50cba31fb6e5', 1, '2025-12-21 09:58:36', '2025-12-14 09:58:36', '2025-12-14 09:58:36'),
(127, 'b8356e16b418064ca60c440a799774b36edfd931aecafd457ea20463772e9e59265f7f29cab17828ca82637519522280ce34d90402710bc9ed6653387d30055c', 1, '2025-12-21 16:31:16', '2025-12-14 16:31:16', '2025-12-14 16:31:16'),
(128, '8390c2140ef6d761d27ef56eaf4b74f98dcb0b58b59b210273b668bdd0567ed5826fe110304e2bff30c7ca49e3919f0cd074e6848dd9f89f58362e0c514aa5a8', 1, '2025-12-21 17:54:49', '2025-12-14 17:54:49', '2025-12-14 17:54:49'),
(129, '45423ec85791349af23180e204e267c4a89081281a55b967431d2ce443a0d65ec61eae4c36a71fd1f531abc3c756b5f4f4f19e2355bff867069b2686f88b3d9e', 42, '2025-12-21 19:51:07', '2025-12-14 19:51:07', '2025-12-14 19:51:07'),
(130, '0b59e6fe9d01bc5197c193ad2a506fca067e342fb6b9c63d0e8cfd82b12a1bc2db82c82e84377134f58b2d70dc516d91d8157bd93e7e27767da50059d79c68d0', 1, '2025-12-21 19:52:13', '2025-12-14 19:52:13', '2025-12-14 19:52:13'),
(131, '23af2b98ccb88be14468f6eb6ac8d48c3f7f67432a3e79554d5922e8c304074a3c480a725f51716a9fce9606bebba5e1e613c21eb88433ada164e74a63b93f41', 43, '2025-12-21 21:49:29', '2025-12-14 21:49:29', '2025-12-14 21:49:29'),
(132, '148e9a87e6f0400bd2a5b1e204ba14a78c4444e686f53d8b99acd7400044fdb92f5f4c57cfd917ea38f986e801480c0c8b64f191c4501465ccbe1a2e32994f2d', 1, '2025-12-21 21:51:14', '2025-12-14 21:51:14', '2025-12-14 21:51:14'),
(133, '7fb1839223dfcbf9fd42977e2c708b74a15610dc3a1c5470787cda23c681cded3e12ffafecac570503ed62be6296273fb00ff3919c9267536e93b60c434e3f51', 41, '2025-12-22 12:33:55', '2025-12-15 12:33:55', '2025-12-15 12:33:55'),
(134, 'a2d9c3cb9d77065b751c680e14a18c1b1451497ba438377e2a0c1b67c230181d8575edd5e2ddcdf9757d0bdd62e5b8d3bbfae3fe15d3b255483b06a126fa8a45', 1, '2025-12-22 17:53:27', '2025-12-15 17:53:27', '2025-12-15 17:53:27'),
(136, 'e8abce4a65d8a49a14f398c58cab789537b626309ed814c87050bc3833c2e3b0d08d9a6645aba2d1a831fa32216efcc42abf4552dbcfd5fb27121a95b4bc4026', 45, '2025-12-22 18:20:27', '2025-12-15 18:20:27', '2025-12-15 18:20:27'),
(137, 'c7bded39d8502a269cc779a886899678dba2e4eb6994317c52e7de58d985abce3818d3b63346805d21a059e463422d6650e976d5b86780fbc7cf701b4db9b261', 1, '2025-12-22 18:21:15', '2025-12-15 18:21:15', '2025-12-15 18:21:15'),
(138, 'f0c5dd9da5846706235576d5ff76e93d89e49d265d9c42ff6793854c2e8416f5a3fa1a2f767edd28d2e5e5e4cdc57e624296f0ae8fa4d4a3e7899efec2d2eedc', 45, '2025-12-22 18:21:48', '2025-12-15 18:21:48', '2025-12-15 18:21:48'),
(139, '3e633608c6e45aee188a4458ecccb752e1e2196c9c4db5f2fdd1713ec4e5f50289193cc3fa10a88ddc40191d335b0f367e595996cdfffe724f6dd66ecc146b7d', 1, '2025-12-22 21:45:45', '2025-12-15 21:45:45', '2025-12-15 21:45:45'),
(140, '3b1b264a0498ee081bad69573ac1aafb2b72faa20e4da7102de2c60104f462be3bbea03f5f4265288696687327d98178c748746fea2dd8ce001f8b70dad7005f', 41, '2025-12-23 12:04:30', '2025-12-16 12:04:30', '2025-12-16 12:04:30'),
(141, '017904cbe3a5b6964eaa06a1ea5b28f7063fbf3065a84c42a004c37ab869acc4a7ba54c03a4d9bd13c48803bc4e147b3ede5968df8fa5375ece740b651fb9442', 1, '2025-12-25 12:17:38', '2025-12-18 12:17:38', '2025-12-18 12:17:38'),
(142, 'd6768121c567bd887fe8a5e033d408c81eaf64c2b8fb457426369d1df6ceeb57886466980e65465b58a0bc4fa607d09236dd71283d3d994a0b97f1e3c5f56411', 1, '2025-12-25 14:30:06', '2025-12-18 14:30:06', '2025-12-18 14:30:06'),
(143, 'f98871e47556ce6a5a0a4d148fff81457d1a8752affbda42c33eb97a2a6591da302f131e7fabcf8c521c0fa750dd44e1d277d51a7e239faa82ec86c71061d4b0', 1, '2025-12-25 16:08:30', '2025-12-18 16:08:30', '2025-12-18 16:08:30'),
(145, '969841aabaaf76c156e7228fe0ff3362dc03bc9f0d00e49bfe845586a1cb2e6bb4b437a31f1b0612ca01c06b846206bef807a40fc8980dee8292f2c4ff84b3d0', 1, '2025-12-26 15:38:54', '2025-12-19 15:38:54', '2025-12-19 15:38:54'),
(146, 'b4b435ee47af984a62408fc28901807da872a1263b983ecbb111b21f75f8dc5bfc75b1462dc7065bf0e0e24cd7a865da47f0e1c166312a584c43c9e3be64f171', 1, '2025-12-27 14:58:10', '2025-12-20 14:58:10', '2025-12-20 14:58:10'),
(147, '7f87340de54391cd096795e9fa43846b0f21d96652d2c7c127908ac1cc7ec96d7d4a0fefb7697c56c1e24b2952bf7ad4f8dee9dbe5c3392be12aa0730fdf0290', 1, '2025-12-27 14:58:19', '2025-12-20 14:58:19', '2025-12-20 14:58:19'),
(148, '152c865b7e8bcd46e1d8f2719919b26234a81672c9ba2e2bb07c96533c452697478d3e9a911156ce7788de26d859964c3c15c5f5ce21606fa09f08447aa07cd4', 1, '2026-01-02 21:27:54', '2025-12-26 21:27:54', '2025-12-26 21:27:54'),
(149, '2ae22ac6f4f1b340a38aeb6b261d1252629ec3e1ea8f90a2a30fb9801d2f88d6e8c8959cacc3d1873e56d51032ff62fde9bb9edfe3b723f8f808d89fece43f65', 1, '2026-01-03 15:23:13', '2025-12-27 15:23:13', '2025-12-27 15:23:13'),
(150, '3e41d8eb223e90ab713e55f6ca8ab4c94a5aad34b5363f3c5ba6ed48af17d3a3efd563225476ca41f65fa6e0c2ea4356d43276f40298e48a5e37060da5205ca4', 1, '2026-01-03 16:26:29', '2025-12-27 16:26:29', '2025-12-27 16:26:29'),
(151, '4b4827a44c9859dc93918c59d544132ff0c4a982bc7003297bafe1582d8a2f7836b8fd03d28edd5feb85ea8c5ad953e6b89ce60ccdbaf27d38acba33ceba11e8', 1, '2026-01-03 17:13:53', '2025-12-27 17:13:53', '2025-12-27 17:13:53'),
(152, 'e3da39591461be72094f4be5a9ba1ebd31d8461b973a859d92af4d2af043e6b28c8ff2c71914682d4a09237861f3c657d6aa508652bc37a4269182ae9e5e5e96', 1, '2026-01-03 18:11:51', '2025-12-27 18:11:51', '2025-12-27 18:11:51'),
(153, 'bfb455752efda1acb33e9186988dffb0550faeeda570b9a2a93f1c51f2cf2122dd8f6f35ca757e48ca20eb5a341d46284fe9069ff0e766bee0c0be32a0746d11', 1, '2026-01-04 19:51:48', '2025-12-28 19:51:48', '2025-12-28 19:51:48'),
(154, '2b88c9a28d461b04b8d6913b5cf5855951f1152c34e21215ef2161bb00f677e42202f4083c7154232a30618a162be2971f984284f6687759430cf8d1198a54bf', 1, '2026-01-05 15:00:04', '2025-12-29 15:00:04', '2025-12-29 15:00:04'),
(157, 'f8af9070e7e8fc1a4612e02bdf68f7dd0fac637fdc196de1337d782f2d28b28fa82595d070d19c731d1ffb7557412b8a3f2eaf3508276838d6e7a7c95a4c15a8', 1, '2026-01-06 12:31:09', '2025-12-30 12:31:09', '2025-12-30 12:31:09'),
(159, '970d766b4c3ca7f4568e6d13514f3964e29662b86f0d6484221403aed73af8cbb84c8177aac78002fb53090cae0ae1231906646d5a5a7ef640ad1c4ab778aaa0', 1, '2026-01-06 18:04:16', '2025-12-30 18:04:16', '2025-12-30 18:04:16'),
(160, '9b3f6ba80118051ccd3196d5d275e3437bb28931a79028eff24d6d8bd6a0bf5029028927b0c6a27b5b8cf89d7a6c75d469e7229337784eeb13fd58cb2bb231e9', 1, '2026-01-08 15:54:44', '2026-01-01 15:54:44', '2026-01-01 15:54:44'),
(161, 'eccfb1bbbafc63d9a6e08cee8d809bf115367ea152e3b08ee9ee270864ff292877ed5e325af72e817e6731f8843f791d302ec9d50bb9345d71b6ad6bf380fe83', 1, '2026-01-09 12:01:40', '2026-01-02 12:01:40', '2026-01-02 12:01:40'),
(162, '82f76ebc089217333639d004b4cd063b948c1b0f736b3bb5541d9deccf1a479070a896e259c7edd18a51e80d7d47cd00a0446af4dc56547bf38e9125846a6885', 1, '2026-01-11 14:19:48', '2026-01-04 14:19:48', '2026-01-04 14:19:48'),
(163, 'c13366989b7b6d33fb357d0e833d17f9124dd0ef1314028c74a825bca0a03e72181e8d49b8cf2a6f589564b701cc61f48df8a570bf363b9d01dcb3a17a425f81', 1, '2026-01-12 18:03:32', '2026-01-05 18:03:32', '2026-01-05 18:03:32'),
(164, 'f9effc10605ed2bf4c605795136969e86b78b6d752218658c98eb73b8032fde8cb81f8f2e6f261e657e8f4e755699a97419544cc24ba8ce21f9e87b1c6fb5486', 1, '2026-01-14 23:21:32', '2026-01-07 23:21:32', '2026-01-07 23:21:32'),
(165, '9d5bf70ce189b04a1d721409b622a3552046afb547c7dfac2e113d77df92eeb411606355c834f9d3a054d6553e56c851eb537cd8b54aba8ab5341610ffc2fb6c', 1, '2026-01-15 17:26:20', '2026-01-08 17:26:20', '2026-01-08 17:26:20'),
(166, 'bbbd502b172502a6acf36cd14565069521001d87254323eda0492aaad0a7c408b5d064aba50959517f679793aa915dc28fc5a489f1c65c2fd2274c8318505a0f', 48, '2026-01-16 13:13:59', '2026-01-09 13:13:59', '2026-01-09 13:13:59'),
(171, 'b8b7a742626aa0b321435b990f396eac56beaefa7c6aca9b629dc4c2172b406bda4020c96f939757352bf4a6d8d3a806a469a08d1b89be8f82d866aead32551a', 1, '2026-01-20 15:00:36', '2026-01-13 15:00:36', '2026-01-13 15:00:36'),
(172, '19292a20acaa2b9d9c29cd330b712e58a5a18f8fdb2ff6c9b8bab1d4126ad37519190790a0ca715186a066d2a9716c9b886ce0547a859b97ac7cabf8d5932bd6', 1, '2026-01-20 15:57:27', '2026-01-13 15:57:27', '2026-01-13 15:57:27'),
(173, '08db7572afb39abf6d4fb58e0df36c5343b998d848452fa1c01bbeece1e8b3d1174926ac271011e00ead2e31c7e22299ebb4152bc658cbdbefa2f042c7c9a96c', 1, '2026-01-23 18:29:56', '2026-01-16 18:29:56', '2026-01-16 18:29:56'),
(177, '99eb8a6b818656202b66a563c2823f7c966092baeb97075fab4d2a7eb912d82c806b199a6dde31d00c5ef4172d7ca73aa0dfb2c4a52cfb90657e2a86dfd10e01', 1, '2026-01-26 15:43:56', '2026-01-19 15:43:56', '2026-01-19 15:43:56'),
(179, '8efb46ad9509d73054dfe8251e826b7502ae57b21cf4c6174985493a8b1f5d41e0138642ca42a80cc98247f014a6346fb5ed7a6465cfb0395905fb0978fbf010', 1, '2026-01-26 17:19:12', '2026-01-19 17:19:12', '2026-01-19 17:19:12'),
(180, '42af41b497b1c6a6a613313aa0bc13c198c6af0bbce7b4ef00ebc75fcd0793f7945b71f68d37af6e69cb472b0ba6f074d0cedbcfba7efcbf263922f55b951bd1', 51, '2026-01-27 12:33:16', '2026-01-20 12:33:16', '2026-01-20 12:33:16'),
(181, '77019086edf8dd1854143d8fcd89d55928bee59edfb17c6fa03ca3d48b94d213fee512c37cc24d82d139805924ddda7f7580a9db032481f1b67321848575098c', 1, '2026-01-27 16:44:11', '2026-01-20 16:44:11', '2026-01-20 16:44:11'),
(184, '86fdccbb9bbcc8368d76e4a2eaa0cf885c76d5b87a61e7ad898c968c88f7c876ac854867c15b2b87587a5b43f66434259d818cf7dd47f18889be7c24fff2e8ea', 47, '2026-01-28 16:48:12', '2026-01-21 16:48:12', '2026-01-21 16:48:12'),
(185, '99642c6936b85e9581e0856cc84709e79fd045adcd088b194d859feb9cfc3fbcf8fbc7090074f2fe005651c4d15672ef3c402fe9d2c014d7c5566d7e091b2d81', 1, '2026-01-29 23:24:14', '2026-01-22 23:24:14', '2026-01-22 23:24:14'),
(190, '7e46d4b97960922575e0c551ceaa6519763b0185bda16c591a4198b4809dcb9355085f11c3553f6c4e907a6e21fcbfd1e92beaea7a55429a08f0491d0ae480b5', 1, '2026-01-30 15:38:04', '2026-01-23 15:38:04', '2026-01-23 15:38:04'),
(191, '81d3022541e3127b67750e4b0beddaceca5514ebe7a9137c51e94ecc5c03863bfb0ed27a68c3ae2597a98eaddebef54fa6d378f11c7ef0072c8c5322cc22cd12', 1, '2026-01-30 17:03:09', '2026-01-23 17:03:09', '2026-01-23 17:03:09'),
(192, 'dffac47efcfe8484f7b8894d7614acea92109de178285c7a71432015a13da401bdf4fdf44fe09173717d330bd53a15cc398e9b6c910e2f06838e9a1a8468fd95', 1, '2026-01-31 11:23:29', '2026-01-24 11:23:29', '2026-01-24 11:23:29'),
(193, 'aac86a018a8dcedf3460adbd7cd6d3a3b2909231e72a00729abad15991f50125d510578f11105e4e72b20fc66a5057a1b7b15b2b8cc7cb8e42685cdd2fbe0bd4', 1, '2026-01-31 11:39:31', '2026-01-24 11:39:31', '2026-01-24 11:39:31'),
(194, 'ea8bde7ed72626463200e6d0d65a4a4811ca0dc1d9eccc29e1179d28de344949425e89437761d56cb035640e64988fc11bd7a06340ba3f910e77af8aad30da58', 1, '2026-01-31 12:09:51', '2026-01-24 12:09:51', '2026-01-24 12:09:51'),
(195, '6b74afcaebca017cd27fd552e7efca335ffa7299891b882c36aae768d891edcc8b719677bb591cfa6ca818fca631b245ae09f8d893aa96b385e512a1e7a161ab', 46, '2026-01-31 12:11:42', '2026-01-24 12:11:42', '2026-01-24 12:11:42'),
(196, 'd58f4d746e43192458cafb3aa2a8c166f564e6970a182d9baadbc7e8d0a7abf1498c2429f3ae9ca760300481975f072f02671a00ab27bb78f4a20b659f22d64c', 46, '2026-01-31 12:15:51', '2026-01-24 12:15:51', '2026-01-24 12:15:51'),
(197, '3332ea5570506ef169b70c4380927208087ceab2394e9cf7b59c96b8138ca558a778e1d3edc2682d094c25e3c44b2889ea6c57b8fcf48b61040c6da9238373ae', 46, '2026-01-31 13:21:54', '2026-01-24 13:21:54', '2026-01-24 13:21:54'),
(198, '7394b15522654505da1a2ed574e9372bdb790489af167f6a5ba28a635369c7390f2c192c6af7d65e9db2991879b1198e5a7a25efc16a4ff9b94bc686fca17eb7', 53, '2026-01-31 16:37:05', '2026-01-24 16:37:05', '2026-01-24 16:37:05'),
(199, '1df9ce21145831e7fdaf360421e44fca89c2caa7c3afa596cf9f074c87056cb95b90f5416cbfb6c9207ecc13c36fb8f753f3e01b4d750996a3a1c616a32214d5', 46, '2026-01-31 17:03:31', '2026-01-24 17:03:31', '2026-01-24 17:03:31'),
(200, '490e6a850f0e1b9b51028ef799ed29ef25d9d753d4c2a611e045df44a79d0026868583e7ebc8954f2a4f8ff7edaa1b29e6edb220f08e4a4a53c9910a5cf89917', 1, '2026-02-03 15:00:46', '2026-01-27 15:00:46', '2026-01-27 15:00:46'),
(201, '3acb10043f7a8a385d9a528b2fd82d436cc5c9e45c900b23b93009481fbf12185c6aad3c5d130d57621331fc01230a4966b2c871b107c1461e5ec80f4525357d', 1, '2026-02-06 20:41:17', '2026-01-30 20:41:17', '2026-01-30 20:41:17'),
(202, 'f8619b0b0b231e7d96bc6695fb108876b627c3cba57849be4fffff1ae03785d87bf542b45c58641689442857ffe69ee4d1024b0fa2bdefc3f49becd95a32612a', 54, '2026-02-06 22:55:35', '2026-01-30 22:55:35', '2026-01-30 22:55:35'),
(203, '46d42766632a727b3c9665c33866eb2de0b9c36d1e750d4735eb48f5b7b303b9714f42e549a1546275290a422743a09754b0239b326a9608674781417445161e', 54, '2026-02-06 22:59:28', '2026-01-30 22:59:28', '2026-01-30 22:59:28'),
(204, '9c7f94b20091a327965c7d62347926c03e478a4a787deda5fea0d9b897c86ba60dd8468d8c61e5eaa30d313a8c4390456d1f93cc587e925fc3ac94b1eb25586f', 54, '2026-02-07 00:25:14', '2026-01-31 00:25:14', '2026-01-31 00:25:14'),
(205, '83a7b30f46270957f6ee709a9913173de0eb8f99f59db9f1e3eb9cfaa1357625183e2e7588af58e0953fb79298022385c253e1e5d8d5fbce0ca87b2b205b3248', 54, '2026-02-07 10:45:05', '2026-01-31 10:45:05', '2026-01-31 10:45:05'),
(206, '88d626187440c2981a91ab29db5c2f76e4172bd430b4503386481bc5025096a246690f22284458d62287cb69e106d83a6f7199fd66eb52c77699c2be11ee13b3', 1, '2026-02-07 11:03:24', '2026-01-31 11:03:24', '2026-01-31 11:03:24'),
(207, '9f06f0e1118a6c424798a21c1fdf3114c8633474aa41996c7564b3922c8998ed347bf6e64859ae3c46875d5e3cbff454bfa6b85d78a48fe7a5c4f17801af26e5', 1, '2026-02-07 12:00:13', '2026-01-31 12:00:13', '2026-01-31 12:00:13'),
(208, '50e80a27db155e55d3ca7b729a86d7e3f75b940f8add19c93380eb917b656b065e2ec80222a80b2e6aeb5909ef606da79dc6ed0eb0e9b5695403709a93ec0f0b', 1, '2026-02-07 12:17:54', '2026-01-31 12:17:54', '2026-01-31 12:17:54'),
(209, 'c938b145224889b22c63464f0a2a1711b9aa809aa276eb9b240bb3f0c2b7b9e902440007350bae60ac22e2726956bb157c82fb7f2ab8bd154a78def59b9d0065', 1, '2026-02-07 15:04:41', '2026-01-31 15:04:41', '2026-01-31 15:04:41'),
(210, '3f7d9fe1e625a76a9b76f9ddb394b5431bdf4a79f87b867521a27d5627cef9e6b4f974dec094952fe98716e50c01c0e8d91fc619ca4501a2318a952641fa7ca7', 50, '2026-02-07 15:06:36', '2026-01-31 15:06:36', '2026-01-31 15:06:36'),
(211, '910214385661545e11bf8029509f2df6242e8ad0904f3f178e9fd99af0f9e8f251f62ebddc979811a73f42befdf40eb56f460adf595b030c9124e5e88694f619', 50, '2026-02-07 16:58:28', '2026-01-31 16:58:28', '2026-01-31 16:58:28');

-- --------------------------------------------------------

--
-- Table structure for table `reservation_advance_payments`
--

CREATE TABLE `reservation_advance_payments` (
  `id` int NOT NULL,
  `user_id` bigint NOT NULL,
  `transaction_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Easebuzz transaction ID (starts with ADV_)',
  `package_id` int DEFAULT NULL COMMENT 'Package for which advance is paid (NULL for custom trips)',
  `vehicle_type_id` int NOT NULL,
  `trip_id` int NOT NULL DEFAULT '3' COMMENT 'Trip type (3 = Reservation)',
  `estimated_total_fare` decimal(10,2) NOT NULL COMMENT 'Total estimated fare for the trip',
  `advance_amount` decimal(10,2) NOT NULL COMMENT 'Advance amount paid (from package or calculated for custom)',
  `remaining_amount` decimal(10,2) DEFAULT NULL COMMENT 'Remaining amount to be paid after trip completion',
  `pickup_date` date NOT NULL COMMENT 'Scheduled pickup date',
  `pickup_time` time NOT NULL COMMENT 'Scheduled pickup time',
  `payment_status` enum('pending','success','failed','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'Payment status',
  `status` enum('pending','paid','used','expired','refunded','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'Overall status - used when ride is created',
  `ride_request_id` bigint DEFAULT NULL,
  `gateway_transaction_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Easebuzz transaction ID (easepayid)',
  `gateway_payment_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Gateway payment ID',
  `bank_ref_num` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Bank reference number',
  `payment_response` text COLLATE utf8mb4_unicode_ci COMMENT 'Complete payment gateway response (JSON)',
  `paid_at` datetime DEFAULT NULL COMMENT 'Timestamp when payment was successful',
  `used_at` datetime DEFAULT NULL COMMENT 'Timestamp when advance was used for ride creation',
  `failed_at` datetime DEFAULT NULL COMMENT 'Timestamp when payment failed',
  `refunded_at` datetime DEFAULT NULL COMMENT 'Timestamp when refund was processed',
  `expires_at` datetime DEFAULT NULL COMMENT 'Expiry timestamp (24 hours after payment)',
  `failure_reason` text COLLATE utf8mb4_unicode_ci COMMENT 'Reason if payment failed',
  `refund_reason` text COLLATE utf8mb4_unicode_ci COMMENT 'Reason for refund',
  `metadata` text COLLATE utf8mb4_unicode_ci COMMENT 'Additional metadata (JSON)',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `pickup_location` text COLLATE utf8mb4_unicode_ci COMMENT 'Pickup location details (JSON string with address, lat, lng, district, state)',
  `drop_location` text COLLATE utf8mb4_unicode_ci COMMENT 'Drop location details (JSON string with address, lat, lng, district, state)',
  `custom_km` decimal(10,2) DEFAULT NULL COMMENT 'Custom kilometers for custom trips',
  `custom_days` int DEFAULT NULL COMMENT 'Number of days for custom trips',
  `is_custom_trip` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'True if this is a custom trip (not a package-based trip)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ride_payment_orders`
--

CREATE TABLE `ride_payment_orders` (
  `id` int NOT NULL,
  `order_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ride_request_id` bigint NOT NULL,
  `transaction_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_type` enum('ride_fare','extra_charges','full_payment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'ride_fare',
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `qr_code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payment_status` enum('pending','success','failed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `gateway_transaction_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_payment_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `breakdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `paid_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ride_requests`
--

CREATE TABLE `ride_requests` (
  `id` bigint NOT NULL,
  `ride_number` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `trip_id` int NOT NULL,
  `trip_type` tinyint NOT NULL COMMENT '1=intercity, 2=outstation',
  `vehicle_type_id` int NOT NULL,
  `package_id` int DEFAULT NULL,
  `is_custom_trip` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indicates if this is a custom reservation trip',
  `custom_km` decimal(8,2) DEFAULT NULL COMMENT 'Custom kilometers for custom reservation trips',
  `custom_days` int DEFAULT NULL COMMENT 'Number of days for custom reservation trips',
  `start_meter_reading` decimal(10,2) DEFAULT NULL COMMENT 'Starting meter reading for reservation trips (trip_type = 3)',
  `start_meter_image` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'URL/path to starting meter reading image for reservation trips',
  `end_meter_reading` decimal(10,2) DEFAULT NULL COMMENT 'Ending meter reading for reservation trips (trip_type = 3)',
  `end_meter_image` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'URL/path to ending meter reading image for reservation trips',
  `driver_id` bigint DEFAULT NULL,
  `coupon_id` int DEFAULT NULL,
  `coupon_code` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `advance_payment_id` int DEFAULT NULL,
  `advance_paid_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Amount paid in advance for reservation trips',
  `remaining_fare_to_pay` decimal(10,2) DEFAULT NULL COMMENT 'Remaining amount to be paid after advance payment deduction',
  `is_advance_paid` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Flag indicating if advance payment was made for this ride',
  `estimated_fare` decimal(10,2) NOT NULL COMMENT 'Total estimated fare including GST - Final amount shown to user at booking',
  `estimated_base_fare` decimal(10,2) DEFAULT NULL COMMENT 'Base Price - Fixed starting fare for the vehicle type',
  `estimated_distance_charge` decimal(10,2) DEFAULT NULL COMMENT 'Charge/Km - Distance-based fare (Journey Distance × Per KM rate from vehicle_types table)',
  `estimated_waiting_charge` decimal(10,2) DEFAULT '0.00' COMMENT 'Waiting Time charge - Initially 0, calculated as (Waiting Time × per minute rate)',
  `estimated_bata_charge` decimal(10,2) DEFAULT '0.00' COMMENT 'BATA Charges - Fixed per trip charge from vehicle_types table',
  `estimated_subtotal` decimal(10,2) DEFAULT NULL COMMENT 'Subtotal before GST - Sum of (Base Fare + Distance Charge + Waiting Charge + BATA Charge)',
  `estimated_distance` decimal(8,2) NOT NULL COMMENT 'Journey Distance (KM)',
  `estimated_duration` int NOT NULL COMMENT 'Expected Time (Minutes)',
  `actual_fare` decimal(10,2) DEFAULT NULL COMMENT 'Total actual fare including GST - Final amount to be charged after ride completion',
  `actual_base_fare` decimal(10,2) DEFAULT NULL COMMENT 'Actual base fare - Same as estimated unless pricing changes',
  `actual_distance_charge` decimal(10,2) DEFAULT NULL COMMENT 'Actual distance charge - Based on GPS tracked actual distance × per KM rate',
  `actual_waiting_charge` decimal(10,2) DEFAULT '0.00' COMMENT 'Actual waiting charge - Real waiting time × per minute rate',
  `actual_bata_charge` decimal(10,2) DEFAULT '0.00' COMMENT 'Actual BATA charge - Usually same as estimated unless pricing rules change',
  `actual_subtotal` decimal(10,2) DEFAULT NULL COMMENT 'Actual subtotal before GST - Sum of all actual charges before tax',
  `actual_distance` decimal(8,2) DEFAULT NULL COMMENT 'Actual distance (KM)',
  `actual_duration` int DEFAULT NULL COMMENT 'Actual duration in minutes',
  `waiting_time` int DEFAULT '0' COMMENT 'Waiting Time (Minutes) - Time between driver arrival and ride start, used for waiting charges',
  `final_fare` decimal(10,2) NOT NULL COMMENT 'Final fare after discount - Amount customer actually pays (Total Including GST - Discount)',
  `discount_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Total discount applied from coupon/promo codes - Deducted from fare',
  `pickup_address` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `pickup_district` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `pickup_state` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `pickup_latitude` decimal(10,8) NOT NULL,
  `pickup_longitude` decimal(11,8) NOT NULL,
  `dropoff_address` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `dropoff_district` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `dropoff_state` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `dropoff_latitude` decimal(10,8) NOT NULL,
  `dropoff_longitude` decimal(11,8) NOT NULL,
  `stop1_address` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `stop1_latitude` decimal(10,8) DEFAULT NULL,
  `stop1_longitude` decimal(11,8) DEFAULT NULL,
  `stop2_address` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `stop2_latitude` decimal(10,8) DEFAULT NULL,
  `stop2_longitude` decimal(11,8) DEFAULT NULL,
  `payment_status` enum('pending','paid','failed','refunded') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `payment_method` enum('cash','wallet','easebuzz') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ride_otp` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `otp_generated_at` datetime DEFAULT NULL,
  `otp_verified_at` datetime DEFAULT NULL,
  `is_reservation_started` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Flag indicating if reservation ride has started (trip_type = 3 only)',
  `reservation_started_at` datetime DEFAULT NULL COMMENT 'Timestamp when reservation ride was started',
  `requested_at` datetime NOT NULL COMMENT 'When user initially requested the ride',
  `accepted_at` datetime DEFAULT NULL COMMENT 'When driver accepted the ride request',
  `driver_distance_at_accept` decimal(8,2) DEFAULT NULL COMMENT 'Distance between driver and pickup when ride was accepted',
  `arrived_at` datetime DEFAULT NULL COMMENT 'When driver reached the pickup location',
  `ride_started_at` datetime DEFAULT NULL COMMENT 'When ride actually started (OTP verified or driver started trip)',
  `ride_completed_at` datetime DEFAULT NULL COMMENT 'When ride was completed and passenger dropped off',
  `cancelled_at` datetime DEFAULT NULL COMMENT 'When ride was cancelled',
  `cancelled_by` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cancellation_reason` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Reason provided for ride cancellation',
  `special_instructions` text COLLATE utf8mb4_general_ci,
  `rating` tinyint(1) DEFAULT NULL COMMENT '1-5 star rating',
  `feedback` text COLLATE utf8mb4_general_ci,
  `is_rated` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Flag to check if the ride has been rated by the passenger',
  `fare_breakdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Complete estimated fare breakdown as JSON - Backup storage for calculation details and audit trail',
  `actual_fare_breakdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Complete actual fare breakdown as JSON - Final calculation after ride completion',
  `drivers_notified` int DEFAULT '0' COMMENT 'Number of drivers notified for this ride',
  `search_started_at` datetime DEFAULT NULL COMMENT 'When driver search began',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` enum('pending','searching_driver','accepted','arrived','ride_started','ride_completed','cancelled','cancelled_by_user','cancelled_by_driver','expired','no_drivers_available','timeout','scheduling_failed','notification_failed','driver_search_failed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `is_scheduled` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indicates if this is a scheduled ride',
  `pickup_date` date DEFAULT NULL COMMENT 'Scheduled pickup date for outstation (type 2) and round-trip (type 3) trips',
  `pickup_time` time DEFAULT NULL COMMENT 'Scheduled pickup time for outstation (type 2) and round-trip (type 3) trips',
  `tip_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Tip amount given by passenger to driver',
  `commission_percentage` decimal(5,2) DEFAULT NULL COMMENT 'DEPRECATED: Legacy field - Use commission_value instead. Commission percentage taken by admin',
  `commission_value` decimal(10,2) DEFAULT '0.00',
  `commission_type` enum('percentage','fixed') COLLATE utf8mb4_general_ci DEFAULT 'percentage',
  `commission_amount` decimal(10,2) DEFAULT NULL COMMENT 'Commission amount taken by admin from total fare',
  `driver_payout` decimal(10,2) DEFAULT NULL COMMENT 'Final amount paid to driver (fare - commission + tip)',
  `is_booking_for_other` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'True if booking for someone else, false if user is taking the ride themselves',
  `rider_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Name of the person who will actually take the ride (rider/passenger)',
  `rider_mobile` varchar(15) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Mobile number of the rider - this is who the driver will contact and pickup',
  `rider_relationship_to_booker` enum('self','family','friend','colleague','client','other') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'self' COMMENT 'Relationship of rider to the person who booked (user_id)',
  `is_interstate` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether ride crosses state boundaries (determines IGST vs CGST+SGST)',
  `estimated_total_gst_amount` decimal(10,2) DEFAULT NULL COMMENT 'Total GST Amount (IGST or CGST+SGST combined)',
  `estimated_igst_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'IGST amount for interstate rides (5% of subtotal)',
  `estimated_cgst_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'CGST amount for intrastate rides (2.5% of subtotal)',
  `estimated_sgst_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'SGST amount for intrastate rides (2.5% of subtotal)',
  `actual_total_gst_amount` decimal(10,2) DEFAULT NULL COMMENT 'Total actual GST amount (IGST or CGST+SGST combined)',
  `actual_igst_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Actual IGST amount for interstate rides',
  `actual_cgst_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Actual CGST amount for intrastate rides',
  `actual_sgst_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Actual SGST amount for intrastate rides',
  `pickup_state_id` int DEFAULT NULL,
  `dropoff_state_id` int DEFAULT NULL,
  `stop1_state_id` int DEFAULT NULL,
  `stop2_state_id` int DEFAULT NULL,
  `available_vehicle_types` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'JSON array of vehicle type IDs available for Book Any Vehicle option based on pickup state',
  `pending_cancellation_applied` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether pending cancellation charge was applied to this ride',
  `pending_cancellation_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Amount of pending cancellation charge applied to this ride',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Stores cancelled_drivers array, restart_attempts counter, and cancellation details',
  `search_restarted_at` datetime DEFAULT NULL COMMENT 'When driver search was restarted after driver cancellation',
  `search_restart_count` int DEFAULT '0' COMMENT 'Number of times driver search has been restarted (max 1)',
  `notified_drivers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'JSON array of drivers notified with their details (driver_id, distance, notified_at)',
  `is_book_any_vehicle` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indicates if the ride was requested with Book Any Vehicle option',
  `eligible_vehicle_type_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'JSON array of eligible vehicle type IDs for Book Any Vehicle requests',
  `is_transferred_to_admin` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indicates if driver transferred this reservation ride back to admin',
  `transferred_at` datetime DEFAULT NULL COMMENT 'When the ride was transferred back to admin',
  `transferred_by_driver_id` bigint DEFAULT NULL COMMENT 'Driver who transferred the ride back to admin',
  `end_ride_otp` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'OTP for ride end verification (reservation trips - trip_id = 3)',
  `end_otp_generated_at` datetime DEFAULT NULL COMMENT 'When end OTP was generated (at ride start)',
  `end_otp_verified_at` datetime DEFAULT NULL COMMENT 'When end OTP was verified (at ride completion)',
  `share_token` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `share_token_created_at` datetime DEFAULT NULL,
  `is_sharing_enabled` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ride_requests`
--

INSERT INTO `ride_requests` (`id`, `ride_number`, `user_id`, `trip_id`, `trip_type`, `vehicle_type_id`, `package_id`, `is_custom_trip`, `custom_km`, `custom_days`, `start_meter_reading`, `start_meter_image`, `end_meter_reading`, `end_meter_image`, `driver_id`, `coupon_id`, `coupon_code`, `advance_payment_id`, `advance_paid_amount`, `remaining_fare_to_pay`, `is_advance_paid`, `estimated_fare`, `estimated_base_fare`, `estimated_distance_charge`, `estimated_waiting_charge`, `estimated_bata_charge`, `estimated_subtotal`, `estimated_distance`, `estimated_duration`, `actual_fare`, `actual_base_fare`, `actual_distance_charge`, `actual_waiting_charge`, `actual_bata_charge`, `actual_subtotal`, `actual_distance`, `actual_duration`, `waiting_time`, `final_fare`, `discount_amount`, `pickup_address`, `pickup_district`, `pickup_state`, `pickup_latitude`, `pickup_longitude`, `dropoff_address`, `dropoff_district`, `dropoff_state`, `dropoff_latitude`, `dropoff_longitude`, `stop1_address`, `stop1_latitude`, `stop1_longitude`, `stop2_address`, `stop2_latitude`, `stop2_longitude`, `payment_status`, `payment_method`, `ride_otp`, `otp_generated_at`, `otp_verified_at`, `is_reservation_started`, `reservation_started_at`, `requested_at`, `accepted_at`, `driver_distance_at_accept`, `arrived_at`, `ride_started_at`, `ride_completed_at`, `cancelled_at`, `cancelled_by`, `cancellation_reason`, `special_instructions`, `rating`, `feedback`, `is_rated`, `fare_breakdown`, `actual_fare_breakdown`, `drivers_notified`, `search_started_at`, `created_at`, `updated_at`, `status`, `is_scheduled`, `pickup_date`, `pickup_time`, `tip_amount`, `commission_percentage`, `commission_value`, `commission_type`, `commission_amount`, `driver_payout`, `is_booking_for_other`, `rider_name`, `rider_mobile`, `rider_relationship_to_booker`, `is_interstate`, `estimated_total_gst_amount`, `estimated_igst_amount`, `estimated_cgst_amount`, `estimated_sgst_amount`, `actual_total_gst_amount`, `actual_igst_amount`, `actual_cgst_amount`, `actual_sgst_amount`, `pickup_state_id`, `dropoff_state_id`, `stop1_state_id`, `stop2_state_id`, `available_vehicle_types`, `pending_cancellation_applied`, `pending_cancellation_amount`, `metadata`, `search_restarted_at`, `search_restart_count`, `notified_drivers`, `is_book_any_vehicle`, `eligible_vehicle_type_ids`, `is_transferred_to_admin`, `transferred_at`, `transferred_by_driver_id`, `end_ride_otp`, `end_otp_generated_at`, `end_otp_verified_at`, `share_token`, `share_token_created_at`, `is_sharing_enabled`) VALUES
(38, 'RID-2025-000001', 33, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 32, NULL, '', NULL, 0.00, 160.86, 0, 160.86, 70.00, 83.20, 10.00, 358.70, 153.20, 8.32, 28, 159.88, 70.00, 82.27, 0.00, 352.77, 152.27, 8.23, -330, 0, 159.88, 0.00, '2344, near Sri Basaveshwara Gayatri Temple, Vanganahalli, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102, India', 'Bangalore Division', 'Karnataka', 12.91200930, 77.64739120, 'RR Tower, 1st Phase, J. P. Nagar, Bengaluru, Karnataka 560078, India', 'Bangalore Division', 'Karnataka', 12.90634330, 77.58568250, NULL, NULL, NULL, NULL, NULL, NULL, 'paid', 'cash', '9090', '2025-12-09 17:04:41', '2025-12-09 17:05:19', 0, NULL, '2025-12-09 17:04:35', '2025-12-09 17:04:41', 0.01, '2025-12-09 17:04:47', '2025-12-09 17:05:19', '2025-12-09 17:05:30', NULL, NULL, NULL, 'Call when arrived', 5, NULL, 1, '\"{\\\"baseFare\\\":70,\\\"distanceCharge\\\":83.2,\\\"waitingTimeCharge\\\":10,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":10,\\\"distancePlusDurationXBata\\\":358.7,\\\"subtotal\\\":153.2,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.83,\\\"sgstAmount\\\":3.83,\\\"gstAmount\\\":7.66,\\\"totalGstAmount\\\":7.66,\\\"totalRideFare\\\":160.86,\\\"totalWithBataAndGst\\\":160.86,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":28,\\\"actualDuration\\\":28,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹70\\\",\\\"distanceCharge\\\":\\\"₹83.2\\\",\\\"waitingTime\\\":\\\"₹10\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹153.2\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.83)\\\",\\\"sgst\\\":\\\"2.5% (₹3.83)\\\",\\\"totalGst\\\":\\\"₹7.66\\\",\\\"totalRideFare\\\":\\\"₹160.86\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹160.86\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹160.86\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹160.86\\\",\\\"finalTotal\\\":\\\"₹160.86\\\"},\\\"distance\\\":8.32,\\\"duration\\\":28,\\\"vehicleType\\\":\\\"Auto\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":160.86,\\\"final_total\\\":160.86,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":160.86,\\\"pickup_state_id\\\":11,\\\"dropoff_state_id\\\":11,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', '\"{\\\"baseFare\\\":70,\\\"distanceCharge\\\":82.27,\\\"waitingTimeCharge\\\":10,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":10,\\\"distancePlusDurationXBata\\\":352.77,\\\"subtotal\\\":152.27,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.81,\\\"sgstAmount\\\":3.81,\\\"gstAmount\\\":7.61,\\\"totalGstAmount\\\":7.61,\\\"totalRideFare\\\":159.88,\\\"totalWithBataAndGst\\\":159.88,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":28,\\\"actualDuration\\\":-330,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹70\\\",\\\"distanceCharge\\\":\\\"₹82.27\\\",\\\"waitingTime\\\":\\\"₹10\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹152.27\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.81)\\\",\\\"sgst\\\":\\\"2.5% (₹3.81)\\\",\\\"totalGst\\\":\\\"₹7.61\\\",\\\"totalRideFare\\\":\\\"₹159.88\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹159.88\\\"},\\\"distance\\\":8.23,\\\"duration\\\":27,\\\"vehicleType\\\":\\\"Auto\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1}\"', 1, '2025-12-09 17:04:35', '2025-12-09 17:04:35', '2025-12-09 17:05:49', 'ride_completed', 0, NULL, NULL, 0.00, 15.00, 15.00, 'percentage', 23.98, 135.90, 0, 'Darshan', '8105489311', 'self', 0, 7.66, 0.00, 3.83, 3.83, 7.61, 0.00, 0.00, 0.00, 11, 11, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, '\"[{\\\"driver_id\\\":32,\\\"distance_km\\\":0.01,\\\"selection_score\\\":null}]\"', 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(39, 'RID-2025-000002', 33, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 32, NULL, '', NULL, 0.00, 160.84, 0, 160.84, 70.00, 83.18, 10.00, 358.68, 153.18, 8.32, 28, 159.87, 70.00, 82.26, 0.00, 352.76, 152.26, 8.23, -330, 0, 159.87, 0.00, '2344, near Sri Basaveshwara Gayatri Temple, Vanganahalli, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102, India', 'Bangalore Division', 'Karnataka', 12.91199860, 77.64737690, 'RR Tower, 1st Phase, J. P. Nagar, Bengaluru, Karnataka 560078, India', 'Bangalore Division', 'Karnataka', 12.90634330, 77.58568250, NULL, NULL, NULL, NULL, NULL, NULL, 'paid', 'cash', '5045', '2025-12-09 17:07:32', '2025-12-09 17:08:13', 0, NULL, '2025-12-09 17:07:24', '2025-12-09 17:07:32', 0.01, '2025-12-09 17:07:39', '2025-12-09 17:08:13', '2025-12-09 17:08:22', NULL, NULL, NULL, 'Call when arrived', 5, NULL, 1, '\"{\\\"baseFare\\\":70,\\\"distanceCharge\\\":83.18,\\\"waitingTimeCharge\\\":10,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":10,\\\"distancePlusDurationXBata\\\":358.68,\\\"subtotal\\\":153.18,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.83,\\\"sgstAmount\\\":3.83,\\\"gstAmount\\\":7.66,\\\"totalGstAmount\\\":7.66,\\\"totalRideFare\\\":160.84,\\\"totalWithBataAndGst\\\":160.84,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":28,\\\"actualDuration\\\":28,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹70\\\",\\\"distanceCharge\\\":\\\"₹83.18\\\",\\\"waitingTime\\\":\\\"₹10\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹153.18\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.83)\\\",\\\"sgst\\\":\\\"2.5% (₹3.83)\\\",\\\"totalGst\\\":\\\"₹7.66\\\",\\\"totalRideFare\\\":\\\"₹160.84\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹160.84\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹160.84\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹160.84\\\",\\\"finalTotal\\\":\\\"₹160.84\\\"},\\\"distance\\\":8.32,\\\"duration\\\":28,\\\"vehicleType\\\":\\\"Auto\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":160.84,\\\"final_total\\\":160.84,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":160.84,\\\"pickup_state_id\\\":11,\\\"dropoff_state_id\\\":11,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', '\"{\\\"baseFare\\\":70,\\\"distanceCharge\\\":82.26,\\\"waitingTimeCharge\\\":10,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":10,\\\"distancePlusDurationXBata\\\":352.76,\\\"subtotal\\\":152.26,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.81,\\\"sgstAmount\\\":3.81,\\\"gstAmount\\\":7.61,\\\"totalGstAmount\\\":7.61,\\\"totalRideFare\\\":159.87,\\\"totalWithBataAndGst\\\":159.87,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":28,\\\"actualDuration\\\":-330,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹70\\\",\\\"distanceCharge\\\":\\\"₹82.26\\\",\\\"waitingTime\\\":\\\"₹10\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹152.26\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.81)\\\",\\\"sgst\\\":\\\"2.5% (₹3.81)\\\",\\\"totalGst\\\":\\\"₹7.61\\\",\\\"totalRideFare\\\":\\\"₹159.87\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹159.87\\\"},\\\"distance\\\":8.23,\\\"duration\\\":27,\\\"vehicleType\\\":\\\"Auto\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1}\"', 1, '2025-12-09 17:07:24', '2025-12-09 17:07:24', '2025-12-09 17:08:41', 'ride_completed', 0, NULL, NULL, 0.00, 15.00, 15.00, 'percentage', 23.98, 135.89, 0, 'Darshan', '8105489311', 'self', 0, 7.66, 0.00, 3.83, 3.83, 7.61, 0.00, 0.00, 0.00, 11, 11, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, '\"[{\\\"driver_id\\\":32,\\\"distance_km\\\":0.01,\\\"selection_score\\\":null}]\"', 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(40, 'RID-2025-000003', 33, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 37, NULL, '', NULL, 0.00, 157.16, 0, 157.16, 50.00, 99.68, 1.00, 429.88, 149.68, 8.31, 28, 160.72, 70.00, 83.07, 0.00, 358.24, 153.07, 8.31, -330, 0, 160.72, 0.00, '2344, near Sri Basaveshwara Gayatri Temple, Vanganahalli, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102, India', 'Bangalore Division', 'Karnataka', 12.91204050, 77.64735040, 'RR Tower, 1st Phase, J. P. Nagar, Bengaluru, Karnataka 560078, India', 'Bangalore Division', 'Karnataka', 12.90634330, 77.58568250, NULL, NULL, NULL, NULL, NULL, NULL, 'paid', 'cash', '5431', '2025-12-09 18:59:25', '2025-12-09 19:00:07', 0, NULL, '2025-12-09 18:59:10', '2025-12-09 18:59:25', 0.00, '2025-12-09 18:59:55', '2025-12-09 19:00:07', '2025-12-09 19:00:12', NULL, NULL, NULL, 'Call when arrived', 3, NULL, 1, '\"{\\\"baseFare\\\":50,\\\"distanceCharge\\\":99.68,\\\"waitingTimeCharge\\\":1,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":12,\\\"distancePlusDurationXBata\\\":429.88,\\\"subtotal\\\":149.68,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.74,\\\"sgstAmount\\\":3.74,\\\"gstAmount\\\":7.48,\\\"totalGstAmount\\\":7.48,\\\"totalRideFare\\\":157.16,\\\"totalWithBataAndGst\\\":157.16,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":28,\\\"actualDuration\\\":28,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹50\\\",\\\"distanceCharge\\\":\\\"₹99.68\\\",\\\"waitingTime\\\":\\\"₹1\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹149.68\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.74)\\\",\\\"sgst\\\":\\\"2.5% (₹3.74)\\\",\\\"totalGst\\\":\\\"₹7.48\\\",\\\"totalRideFare\\\":\\\"₹157.16\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹157.16\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹157.16\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹157.16\\\",\\\"finalTotal\\\":\\\"₹157.16\\\"},\\\"distance\\\":8.31,\\\"duration\\\":28,\\\"vehicleType\\\":\\\"Bike\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":157.16,\\\"final_total\\\":157.16,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":157.16,\\\"pickup_state_id\\\":11,\\\"dropoff_state_id\\\":11,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', '\"{\\\"baseFare\\\":70,\\\"distanceCharge\\\":83.07,\\\"waitingTimeCharge\\\":10,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":10,\\\"distancePlusDurationXBata\\\":358.24,\\\"subtotal\\\":153.07,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.83,\\\"sgstAmount\\\":3.83,\\\"gstAmount\\\":7.65,\\\"totalGstAmount\\\":7.65,\\\"totalRideFare\\\":160.72,\\\"totalWithBataAndGst\\\":160.72,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":28,\\\"actualDuration\\\":-330,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹70\\\",\\\"distanceCharge\\\":\\\"₹83.07\\\",\\\"waitingTime\\\":\\\"₹10\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹153.07\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.83)\\\",\\\"sgst\\\":\\\"2.5% (₹3.83)\\\",\\\"totalGst\\\":\\\"₹7.65\\\",\\\"totalRideFare\\\":\\\"₹160.72\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹160.72\\\"},\\\"distance\\\":8.31,\\\"duration\\\":28,\\\"vehicleType\\\":\\\"Auto\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1}\"', 2, '2025-12-09 18:59:10', '2025-12-09 18:59:10', '2025-12-09 19:00:19', 'ride_completed', 0, NULL, NULL, 0.00, 15.00, 15.00, 'percentage', 24.11, 136.61, 0, 'Darshan', '8105489311', 'self', 0, 7.48, 0.00, 3.74, 3.74, 7.65, 0.00, 0.00, 0.00, 11, 11, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, '\"[{\\\"driver_id\\\":32,\\\"distance_km\\\":0,\\\"selection_score\\\":100,\\\"vehicle_type_id\\\":1,\\\"vehicle_type_name\\\":\\\"Auto\\\",\\\"vehicle_capacity\\\":3},{\\\"driver_id\\\":37,\\\"distance_km\\\":0.01,\\\"selection_score\\\":99.98,\\\"vehicle_type_id\\\":1,\\\"vehicle_type_name\\\":\\\"Auto\\\",\\\"vehicle_capacity\\\":3}]\"', 1, '\"[2,6,1,3,5,4]\"', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(41, 'RID-2025-000004', 33, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 37, NULL, '', NULL, 0.00, 160.72, 0, 160.72, 70.00, 83.07, 10.00, 358.24, 153.07, 8.31, 28, 160.72, 70.00, 83.07, 0.00, 358.24, 153.07, 8.31, -330, 0, 160.72, 0.00, '2344, near Sri Basaveshwara Gayatri Temple, Vanganahalli, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102, India', 'Bangalore Division', 'Karnataka', 12.91205240, 77.64734930, 'RR Tower, 1st Phase, J. P. Nagar, Bengaluru, Karnataka 560078, India', 'Bangalore Division', 'Karnataka', 12.90634330, 77.58568250, NULL, NULL, NULL, NULL, NULL, NULL, 'paid', 'cash', '3562', '2025-12-09 19:03:38', '2025-12-09 19:05:18', 0, NULL, '2025-12-09 19:03:25', '2025-12-09 19:03:38', 0.62, '2025-12-09 19:04:30', '2025-12-09 19:05:18', '2025-12-09 19:05:35', NULL, NULL, NULL, 'Call when arrived', 4, NULL, 1, '\"{\\\"baseFare\\\":70,\\\"distanceCharge\\\":83.07,\\\"waitingTimeCharge\\\":10,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":10,\\\"distancePlusDurationXBata\\\":358.24,\\\"subtotal\\\":153.07,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.83,\\\"sgstAmount\\\":3.83,\\\"gstAmount\\\":7.65,\\\"totalGstAmount\\\":7.65,\\\"totalRideFare\\\":160.72,\\\"totalWithBataAndGst\\\":160.72,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":28,\\\"actualDuration\\\":28,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹70\\\",\\\"distanceCharge\\\":\\\"₹83.07\\\",\\\"waitingTime\\\":\\\"₹10\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹153.07\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.83)\\\",\\\"sgst\\\":\\\"2.5% (₹3.83)\\\",\\\"totalGst\\\":\\\"₹7.65\\\",\\\"totalRideFare\\\":\\\"₹160.72\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹160.72\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹160.72\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹160.72\\\",\\\"finalTotal\\\":\\\"₹160.72\\\"},\\\"distance\\\":8.31,\\\"duration\\\":28,\\\"vehicleType\\\":\\\"Auto\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":160.72,\\\"final_total\\\":160.72,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":160.72,\\\"pickup_state_id\\\":11,\\\"dropoff_state_id\\\":11,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', '\"{\\\"baseFare\\\":70,\\\"distanceCharge\\\":83.07,\\\"waitingTimeCharge\\\":10,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":10,\\\"distancePlusDurationXBata\\\":358.24,\\\"subtotal\\\":153.07,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.83,\\\"sgstAmount\\\":3.83,\\\"gstAmount\\\":7.65,\\\"totalGstAmount\\\":7.65,\\\"totalRideFare\\\":160.72,\\\"totalWithBataAndGst\\\":160.72,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":28,\\\"actualDuration\\\":-330,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹70\\\",\\\"distanceCharge\\\":\\\"₹83.07\\\",\\\"waitingTime\\\":\\\"₹10\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹153.07\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.83)\\\",\\\"sgst\\\":\\\"2.5% (₹3.83)\\\",\\\"totalGst\\\":\\\"₹7.65\\\",\\\"totalRideFare\\\":\\\"₹160.72\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹160.72\\\"},\\\"distance\\\":8.31,\\\"duration\\\":28,\\\"vehicleType\\\":\\\"Auto\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1}\"', 2, '2025-12-09 19:03:25', '2025-12-09 19:03:25', '2025-12-09 19:06:14', 'ride_completed', 0, NULL, NULL, 0.00, 15.00, 15.00, 'percentage', 24.11, 136.61, 0, 'Darshan', '8105489311', 'self', 0, 7.65, 0.00, 3.83, 3.83, 7.65, 0.00, 0.00, 0.00, 11, 11, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, '\"[{\\\"driver_id\\\":32,\\\"distance_km\\\":0,\\\"selection_score\\\":null},{\\\"driver_id\\\":37,\\\"distance_km\\\":0.01,\\\"selection_score\\\":null}]\"', 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(42, 'RID-2025-000005', 33, 1, 1, 4, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 39, NULL, '', NULL, 0.00, 156.14, 0, 156.14, 50.00, 98.70, 1.00, 423.30, 148.70, 8.22, 27, 191.36, 100.00, 82.25, 0.00, 352.75, 182.25, 8.22, -330, 0, 191.36, 0.00, '2344, near Sri Basaveshwara Gayatri Temple, Vanganahalli, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102, India', 'Bangalore Division', 'Karnataka', 12.91197500, 77.64737440, '24th Main Rd, KR Layout, 2nd Phase, J. P. Nagar, Bengaluru, Karnataka 560078, India', 'Bangalore Division', 'Karnataka', 12.90634330, 77.58568250, NULL, NULL, NULL, NULL, NULL, NULL, 'paid', 'cash', '3496', '2025-12-10 10:32:46', '2025-12-10 10:33:08', 0, NULL, '2025-12-10 10:32:36', '2025-12-10 10:32:46', 0.00, '2025-12-10 10:32:59', '2025-12-10 10:33:08', '2025-12-10 10:33:13', NULL, NULL, NULL, 'Call when arrived', 5, NULL, 1, '\"{\\\"baseFare\\\":50,\\\"distanceCharge\\\":98.7,\\\"waitingTimeCharge\\\":1,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":12,\\\"distancePlusDurationXBata\\\":423.3,\\\"subtotal\\\":148.7,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.72,\\\"sgstAmount\\\":3.72,\\\"gstAmount\\\":7.44,\\\"totalGstAmount\\\":7.44,\\\"totalRideFare\\\":156.14,\\\"totalWithBataAndGst\\\":156.14,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":27,\\\"actualDuration\\\":27,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹50\\\",\\\"distanceCharge\\\":\\\"₹98.7\\\",\\\"waitingTime\\\":\\\"₹1\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹148.7\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.72)\\\",\\\"sgst\\\":\\\"2.5% (₹3.72)\\\",\\\"totalGst\\\":\\\"₹7.44\\\",\\\"totalRideFare\\\":\\\"₹156.14\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹156.14\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹156.14\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹156.14\\\",\\\"finalTotal\\\":\\\"₹156.14\\\"},\\\"distance\\\":8.22,\\\"duration\\\":27,\\\"vehicleType\\\":\\\"Bike\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":156.14,\\\"final_total\\\":156.14,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":156.14,\\\"pickup_state_id\\\":11,\\\"dropoff_state_id\\\":11,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', '\"{\\\"baseFare\\\":100,\\\"distanceCharge\\\":82.25,\\\"waitingTimeCharge\\\":20,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":10,\\\"distancePlusDurationXBata\\\":352.75,\\\"subtotal\\\":182.25,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":4.56,\\\"sgstAmount\\\":4.56,\\\"gstAmount\\\":9.11,\\\"totalGstAmount\\\":9.11,\\\"totalRideFare\\\":191.36,\\\"totalWithBataAndGst\\\":191.36,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":27,\\\"actualDuration\\\":-330,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹100\\\",\\\"distanceCharge\\\":\\\"₹82.25\\\",\\\"waitingTime\\\":\\\"₹20\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹182.25\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹4.56)\\\",\\\"sgst\\\":\\\"2.5% (₹4.56)\\\",\\\"totalGst\\\":\\\"₹9.11\\\",\\\"totalRideFare\\\":\\\"₹191.36\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹191.36\\\"},\\\"distance\\\":8.22,\\\"duration\\\":27,\\\"vehicleType\\\":\\\"Cab XL\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1}\"', 1, '2025-12-10 10:32:37', '2025-12-10 10:32:36', '2025-12-10 10:33:21', 'ride_completed', 0, NULL, NULL, 0.00, 15.00, 15.00, 'percentage', 28.70, 162.66, 0, 'Darshan', '8105489311', 'self', 0, 7.44, 0.00, 3.72, 3.72, 9.11, 0.00, 0.00, 0.00, 11, 11, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, '\"[{\\\"driver_id\\\":32,\\\"distance_km\\\":0,\\\"selection_score\\\":100,\\\"vehicle_type_id\\\":1,\\\"vehicle_type_name\\\":\\\"Auto\\\",\\\"vehicle_capacity\\\":3},{\\\"driver_id\\\":39,\\\"distance_km\\\":0,\\\"selection_score\\\":100,\\\"vehicle_type_id\\\":4,\\\"vehicle_type_name\\\":\\\"Cab XL\\\",\\\"vehicle_capacity\\\":7},{\\\"driver_id\\\":37,\\\"distance_km\\\":0.01,\\\"selection_score\\\":99.98,\\\"vehicle_type_id\\\":1,\\\"vehicle_type_name\\\":\\\"Auto\\\",\\\"vehicle_capacity\\\":3}]\"', 1, '\"[2,6,1,3,5,4]\"', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(43, 'RID-2025-000006', 33, 1, 1, 4, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 39, NULL, '', NULL, 0.00, 156.15, 0, 156.15, 50.00, 98.71, 1.00, 423.31, 148.71, 8.23, 27, 191.37, 100.00, 82.26, 0.00, 352.76, 182.26, 8.23, -330, 0, 191.37, 0.00, '2344, near Sri Basaveshwara Gayatri Temple, Vanganahalli, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102, India', 'Bangalore Division', 'Karnataka', 12.91198300, 77.64737680, '24th Main Rd, KR Layout, 2nd Phase, J. P. Nagar, Bengaluru, Karnataka 560078, India', 'Bangalore Division', 'Karnataka', 12.90634330, 77.58568250, NULL, NULL, NULL, NULL, NULL, NULL, 'paid', 'cash', '4670', '2025-12-11 10:40:06', '2025-12-11 10:40:29', 0, NULL, '2025-12-11 10:39:59', '2025-12-11 10:40:06', 0.00, '2025-12-11 10:40:16', '2025-12-11 10:40:29', '2025-12-11 10:40:38', NULL, NULL, NULL, 'Call when arrived', NULL, NULL, 0, '\"{\\\"baseFare\\\":50,\\\"distanceCharge\\\":98.71,\\\"waitingTimeCharge\\\":1,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":12,\\\"distancePlusDurationXBata\\\":423.31,\\\"subtotal\\\":148.71,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.72,\\\"sgstAmount\\\":3.72,\\\"gstAmount\\\":7.44,\\\"totalGstAmount\\\":7.44,\\\"totalRideFare\\\":156.15,\\\"totalWithBataAndGst\\\":156.15,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":27,\\\"actualDuration\\\":27,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹50\\\",\\\"distanceCharge\\\":\\\"₹98.71\\\",\\\"waitingTime\\\":\\\"₹1\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹148.71\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.72)\\\",\\\"sgst\\\":\\\"2.5% (₹3.72)\\\",\\\"totalGst\\\":\\\"₹7.44\\\",\\\"totalRideFare\\\":\\\"₹156.15\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹156.15\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹156.15\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹156.15\\\",\\\"finalTotal\\\":\\\"₹156.15\\\"},\\\"distance\\\":8.23,\\\"duration\\\":27,\\\"vehicleType\\\":\\\"Bike\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":156.15,\\\"final_total\\\":156.15,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":156.15,\\\"pickup_state_id\\\":11,\\\"dropoff_state_id\\\":11,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', '\"{\\\"baseFare\\\":100,\\\"distanceCharge\\\":82.26,\\\"waitingTimeCharge\\\":20,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":10,\\\"distancePlusDurationXBata\\\":352.76,\\\"subtotal\\\":182.26,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":4.56,\\\"sgstAmount\\\":4.56,\\\"gstAmount\\\":9.11,\\\"totalGstAmount\\\":9.11,\\\"totalRideFare\\\":191.37,\\\"totalWithBataAndGst\\\":191.37,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":27,\\\"actualDuration\\\":-330,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹100\\\",\\\"distanceCharge\\\":\\\"₹82.26\\\",\\\"waitingTime\\\":\\\"₹20\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹182.26\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹4.56)\\\",\\\"sgst\\\":\\\"2.5% (₹4.56)\\\",\\\"totalGst\\\":\\\"₹9.11\\\",\\\"totalRideFare\\\":\\\"₹191.37\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹191.37\\\"},\\\"distance\\\":8.23,\\\"duration\\\":27,\\\"vehicleType\\\":\\\"Cab XL\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1}\"', 1, '2025-12-11 10:40:00', '2025-12-11 10:39:59', '2025-12-11 10:41:40', 'ride_completed', 0, NULL, NULL, 0.00, 15.00, 15.00, 'percentage', 28.71, 162.66, 0, 'Darshan', '8105489311', 'self', 0, 7.44, 0.00, 3.72, 3.72, 9.11, 0.00, 0.00, 0.00, 11, 11, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, '\"[{\\\"driver_id\\\":32,\\\"distance_km\\\":0,\\\"selection_score\\\":100,\\\"vehicle_type_id\\\":1,\\\"vehicle_type_name\\\":\\\"Auto\\\",\\\"vehicle_capacity\\\":3},{\\\"driver_id\\\":39,\\\"distance_km\\\":0,\\\"selection_score\\\":100,\\\"vehicle_type_id\\\":4,\\\"vehicle_type_name\\\":\\\"Cab XL\\\",\\\"vehicle_capacity\\\":7},{\\\"driver_id\\\":37,\\\"distance_km\\\":0.01,\\\"selection_score\\\":99.98,\\\"vehicle_type_id\\\":1,\\\"vehicle_type_name\\\":\\\"Auto\\\",\\\"vehicle_capacity\\\":3}]\"', 1, '\"[2,6,1,3,5,4]\"', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(44, 'RID-2025-000007', 47, 1, 1, 2, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 0.00, 157.83, 0, 157.83, 50.00, 100.31, 1.00, 423.11, 150.31, 8.36, 27, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL, NULL, 0, 157.83, 0.00, 'WJPF+3RV, KHB Colony, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India', 'Bangalore Division', 'Karnataka', 12.93524030, 77.62453200, '24th Main Rd, KR Layout, 2nd Phase, J. P. Nagar, Bengaluru, Karnataka 560078, India', 'Bangalore Division', 'Karnataka', 12.90634330, 77.58568250, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'cash', NULL, NULL, NULL, 0, NULL, '2025-12-30 12:26:26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Call when arrived', NULL, NULL, 0, '\"{\\\"baseFare\\\":50,\\\"distanceCharge\\\":100.31,\\\"waitingTimeCharge\\\":1,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":12,\\\"distancePlusDurationXBata\\\":423.11,\\\"subtotal\\\":150.31,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.76,\\\"sgstAmount\\\":3.76,\\\"gstAmount\\\":7.52,\\\"totalGstAmount\\\":7.52,\\\"totalRideFare\\\":157.83,\\\"totalWithBataAndGst\\\":157.83,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":27,\\\"actualDuration\\\":27,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹50\\\",\\\"distanceCharge\\\":\\\"₹100.31\\\",\\\"waitingTime\\\":\\\"₹1\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹150.31\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.76)\\\",\\\"sgst\\\":\\\"2.5% (₹3.76)\\\",\\\"totalGst\\\":\\\"₹7.52\\\",\\\"totalRideFare\\\":\\\"₹157.83\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹157.83\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹157.83\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹157.83\\\",\\\"finalTotal\\\":\\\"₹157.83\\\"},\\\"distance\\\":8.36,\\\"duration\\\":27,\\\"vehicleType\\\":\\\"Bike\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":157.83,\\\"final_total\\\":157.83,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":157.83,\\\"pickup_state_id\\\":11,\\\"dropoff_state_id\\\":11,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', NULL, 0, NULL, '2025-12-30 12:26:26', '2025-12-30 12:26:27', 'no_drivers_available', 0, NULL, NULL, 0.00, NULL, 0.00, 'percentage', NULL, NULL, 0, 'Dar', '8105489311', 'self', 0, 7.52, 0.00, 3.76, 3.76, NULL, 0.00, 0.00, 0.00, 11, 11, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, NULL, 1, '\"[2,6,1,3,5,4]\"', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(45, 'RID-2025-000008', 47, 1, 1, 2, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 46, NULL, '', NULL, 0.00, 115.50, 0, 115.50, 100.00, 3.91, 1.00, 1.44, 110.00, 0.39, 1, 115.50, 100.00, 3.91, 0.00, 1.44, 110.00, 0.39, -330, 0, 115.50, 0.00, '1/62, Perur, Coimbatore, Tamil Nadu 641010, India', 'Coimbatore', 'Tamil Nadu', 10.97696140, 76.91846920, 'XWG8+54X, Coimbatore, Tamil Nadu 641010, India', 'Coimbatore', 'Tamil Nadu', 10.97548610, 76.91534590, NULL, NULL, NULL, NULL, NULL, NULL, 'paid', 'cash', '5377', '2025-12-30 18:55:59', '2025-12-30 18:56:23', 0, NULL, '2025-12-30 18:55:54', '2025-12-30 18:55:59', 0.01, '2025-12-30 18:56:13', '2025-12-30 18:56:23', '2025-12-30 18:56:31', NULL, NULL, NULL, 'Call when arrived', 5, NULL, 1, '\"{\\\"baseFare\\\":100,\\\"distanceCharge\\\":3.91,\\\"waitingTimeCharge\\\":1,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":1,\\\"distancePlusDurationXBata\\\":1.44,\\\"subtotal\\\":110,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":2.75,\\\"sgstAmount\\\":2.75,\\\"gstAmount\\\":5.5,\\\"totalGstAmount\\\":5.5,\\\"totalRideFare\\\":115.5,\\\"totalWithBataAndGst\\\":115.5,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":1,\\\"actualDuration\\\":1,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹100\\\",\\\"distanceCharge\\\":\\\"₹3.91\\\",\\\"waitingTime\\\":\\\"₹1\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹110\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹2.75)\\\",\\\"sgst\\\":\\\"2.5% (₹2.75)\\\",\\\"totalGst\\\":\\\"₹5.5\\\",\\\"totalRideFare\\\":\\\"₹115.5\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹115.5\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹115.50\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹115.50\\\",\\\"finalTotal\\\":\\\"₹115.50\\\"},\\\"distance\\\":0.39,\\\"duration\\\":1,\\\"vehicleType\\\":\\\"Bike\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":115.5,\\\"final_total\\\":115.5,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":115.5,\\\"pickup_state_id\\\":23,\\\"dropoff_state_id\\\":23,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', '\"{\\\"baseFare\\\":100,\\\"distanceCharge\\\":3.91,\\\"waitingTimeCharge\\\":1,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":1,\\\"distancePlusDurationXBata\\\":1.44,\\\"subtotal\\\":110,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":2.75,\\\"sgstAmount\\\":2.75,\\\"gstAmount\\\":5.5,\\\"totalGstAmount\\\":5.5,\\\"totalRideFare\\\":115.5,\\\"totalWithBataAndGst\\\":115.5,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":1,\\\"actualDuration\\\":-330,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹100\\\",\\\"distanceCharge\\\":\\\"₹3.91\\\",\\\"waitingTime\\\":\\\"₹1\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹110\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹2.75)\\\",\\\"sgst\\\":\\\"2.5% (₹2.75)\\\",\\\"totalGst\\\":\\\"₹5.5\\\",\\\"totalRideFare\\\":\\\"₹115.5\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹115.5\\\"},\\\"distance\\\":0.39,\\\"duration\\\":1,\\\"vehicleType\\\":\\\"Bike\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1}\"', 1, '2025-12-30 18:55:54', '2025-12-30 18:55:54', '2025-12-30 18:56:41', 'ride_completed', 0, NULL, NULL, 0.00, NULL, 15.00, 'percentage', 17.32, 98.17, 0, 'Dar', '8105489311', 'self', 0, 5.50, 0.00, 2.75, 2.75, 5.50, 0.00, 0.00, 0.00, 23, 23, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, '\"[{\\\"driver_id\\\":46,\\\"distance_km\\\":0.01,\\\"selection_score\\\":99.98,\\\"vehicle_type_id\\\":2,\\\"vehicle_type_name\\\":\\\"Bike\\\",\\\"vehicle_capacity\\\":1}]\"', 1, '\"[2]\"', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(46, 'RID-2026-000001', 48, 1, 1, 2, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 0.00, 124.87, 0, 124.87, 50.00, 68.92, 1.00, 305.12, 118.92, 5.74, 20, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL, NULL, 0, 124.87, 0.00, '2344, near Sri Basaveshwara Gayatri Temple, Vanganahalli, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102, India', 'Bangalore Division', 'Karnataka', 12.91195410, 77.64737690, 'VJHQ+G33, AECS C Block, Begur, Bengaluru, Karnataka 560114, India', 'Bangalore Division', 'Karnataka', 12.87876730, 77.63766760, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'cash', NULL, NULL, NULL, 0, NULL, '2026-01-09 13:15:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Call when arrived', NULL, NULL, 0, '\"{\\\"baseFare\\\":50,\\\"distanceCharge\\\":68.92,\\\"waitingTimeCharge\\\":1,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":12,\\\"distancePlusDurationXBata\\\":305.12,\\\"subtotal\\\":118.92,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":2.97,\\\"sgstAmount\\\":2.97,\\\"gstAmount\\\":5.95,\\\"totalGstAmount\\\":5.95,\\\"totalRideFare\\\":124.87,\\\"totalWithBataAndGst\\\":124.87,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":20,\\\"actualDuration\\\":20,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹50\\\",\\\"distanceCharge\\\":\\\"₹68.92\\\",\\\"waitingTime\\\":\\\"₹1\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹118.92\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹2.97)\\\",\\\"sgst\\\":\\\"2.5% (₹2.97)\\\",\\\"totalGst\\\":\\\"₹5.95\\\",\\\"totalRideFare\\\":\\\"₹124.87\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹124.87\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹124.87\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹124.87\\\",\\\"finalTotal\\\":\\\"₹124.87\\\"},\\\"distance\\\":5.74,\\\"duration\\\":20,\\\"vehicleType\\\":\\\"Bike\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":124.87,\\\"final_total\\\":124.87,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":124.87,\\\"pickup_state_id\\\":11,\\\"dropoff_state_id\\\":11,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', NULL, 0, NULL, '2026-01-09 13:15:28', '2026-01-09 13:15:28', 'no_drivers_available', 0, NULL, NULL, 0.00, NULL, 0.00, 'percentage', NULL, NULL, 0, 'Mani', '7502558479', 'self', 0, 5.95, 0.00, 2.98, 2.98, NULL, 0.00, 0.00, 0.00, 11, 11, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
(47, 'RID-2026-000002', 48, 1, 1, 3, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 0.00, 165.28, 0, 165.28, 100.00, 57.41, 2.00, 508.49, 157.41, 5.74, 20, NULL, NULL, NULL, 0.00, 0.00, NULL, NULL, NULL, 0, 165.28, 0.00, '2345, 17th Cross Rd, Sector 5, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102, India', 'Bangalore Division', 'Karnataka', 12.91196050, 77.64739980, 'VJHQ+G33, AECS C Block, Begur, Bengaluru, Karnataka 560114, India', 'Bangalore Division', 'Karnataka', 12.87876730, 77.63766760, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'cash', NULL, NULL, NULL, 0, NULL, '2026-01-09 15:32:35', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Call when arrived', NULL, NULL, 0, '\"{\\\"baseFare\\\":100,\\\"distanceCharge\\\":57.41,\\\"waitingTimeCharge\\\":2,\\\"waitingTimeXExtraTime\\\":0,\\\"bataCharge\\\":20,\\\"distancePlusDurationXBata\\\":508.49,\\\"subtotal\\\":157.41,\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"isInterstate\\\":null,\\\"igstRate\\\":5,\\\"cgstRate\\\":2.5,\\\"sgstRate\\\":2.5,\\\"igstAmount\\\":0,\\\"cgstAmount\\\":3.94,\\\"sgstAmount\\\":3.94,\\\"gstAmount\\\":7.87,\\\"totalGstAmount\\\":7.87,\\\"totalRideFare\\\":165.28,\\\"totalWithBataAndGst\\\":165.28,\\\"rideType\\\":\\\"normal\\\",\\\"isWaitRide\\\":false,\\\"isBataTime\\\":false,\\\"tripType\\\":\\\"INTERCITY\\\",\\\"estimatedDuration\\\":20,\\\"actualDuration\\\":20,\\\"extraMinutes\\\":0,\\\"fareBreakdown\\\":{\\\"baseFare\\\":\\\"₹100\\\",\\\"distanceCharge\\\":\\\"₹57.41\\\",\\\"waitingTime\\\":\\\"₹2\\\",\\\"waitingTimeXExtraTime\\\":\\\"₹0\\\",\\\"bataCharges\\\":\\\"₹0\\\",\\\"subtotal\\\":\\\"₹157.41\\\",\\\"gstType\\\":\\\"CGST_SGST\\\",\\\"cgst\\\":\\\"2.5% (₹3.94)\\\",\\\"sgst\\\":\\\"2.5% (₹3.94)\\\",\\\"totalGst\\\":\\\"₹7.87\\\",\\\"totalRideFare\\\":\\\"₹165.28\\\",\\\"totalRideFareInclBataCharge\\\":\\\"₹165.28\\\",\\\"pendingCancellationCharge\\\":\\\"₹0.00\\\",\\\"subtotalBeforeCancellation\\\":\\\"₹165.28\\\",\\\"advancePaid\\\":\\\"₹0.00\\\",\\\"remainingToPay\\\":\\\"₹165.28\\\",\\\"finalTotal\\\":\\\"₹165.28\\\"},\\\"distance\\\":5.74,\\\"duration\\\":20,\\\"vehicleType\\\":\\\"Mini\\\",\\\"tripId\\\":\\\"ONE WAY\\\",\\\"determinedTripType\\\":1,\\\"pending_cancellation_charge\\\":0,\\\"subtotal_before_cancellation\\\":165.28,\\\"final_total\\\":165.28,\\\"advance_paid\\\":0,\\\"remaining_to_pay\\\":165.28,\\\"pickup_state_id\\\":11,\\\"dropoff_state_id\\\":11,\\\"is_interstate\\\":false,\\\"stop1_state_id\\\":null,\\\"stop2_state_id\\\":null}\"', NULL, 0, NULL, '2026-01-09 15:32:35', '2026-01-09 15:32:35', 'no_drivers_available', 0, NULL, NULL, 0.00, NULL, 0.00, 'percentage', NULL, NULL, 0, 'Mani', '7502558479', 'self', 0, 7.87, 0.00, 3.94, 3.94, NULL, 0.00, 0.00, 0.00, 11, 11, NULL, NULL, NULL, 0, 0.00, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Admin', '2025-05-12 12:15:29', '2025-05-12 12:15:29'),
(2, 'User', '2025-05-12 12:15:29', '2025-05-12 12:15:29'),
(3, 'Driver', '2025-05-12 12:15:29', '2025-05-12 12:15:29'),
(4, 'Manager', '2025-08-21 14:31:33', '2025-08-21 14:31:33'),
(5, 'Executive', '2025-08-21 14:31:44', '2025-08-21 14:31:44'),
(6, 'Superadmin', '2025-08-23 13:00:20', '2025-08-23 13:00:20'),
(7, 'Support', '2025-10-06 16:12:57', '2025-10-06 16:12:57');

-- --------------------------------------------------------

--
-- Table structure for table `saved_address`
--

CREATE TABLE `saved_address` (
  `id` int NOT NULL,
  `user_id` bigint NOT NULL,
  `type` enum('search','home','work','other') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'other',
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `address` text COLLATE utf8mb4_general_ci NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `frequency_count` int NOT NULL DEFAULT '1',
  `last_used_at` datetime DEFAULT NULL,
  `status` int DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `polygon_coordinates` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `vehicle_type_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `status` int NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `name`, `description`, `polygon_coordinates`, `vehicle_type_ids`, `status`, `created_at`, `updated_at`) VALUES
(1, 'KARNATAKA SERVICE', NULL, '\"[[[77.72112206436414,15.71909848213364],[78.24934763794309,15.668423464224814],[78.75655869995697,15.518419364505649],[79.22267594324514,15.27505752223917],[79.62942835990417,14.947991682620591],[79.96111102877563,14.550132240254916],[80.20518984757841,14.097090534381907],[80.35273358206724,13.606526217171746],[80.39867037900937,13.097431967716522],[80.34187837790063,12.589388019378854],[80.1851270561604,12.101815448303348],[79.93488796555063,11.653253259016767],[79.60103224497534,11.26068093232589],[79.19642981693237,10.93890563853152],[78.73646329238939,10.700031593969301],[78.23846937066318,10.553027521509136],[77.72112206436414,10.503406234873784],[77.2037747580651,10.553027521509138],[76.70578083633889,10.700031593969301],[76.24581431179593,10.938905638531516],[75.84121188375295,11.26068093232589],[75.50735616317766,11.653253259016767],[75.2571170725679,12.101815448303347],[75.10036575082766,12.58938801937885],[75.0435737497189,13.097431967716522],[75.08951054666105,13.606526217171746],[75.23705428114988,14.097090534381907],[75.48113309995266,14.550132240254914],[75.81281576882411,14.947991682620591],[76.21956818548315,15.27505752223917],[76.68568542877132,15.518419364505649],[77.1928964907852,15.668423464224814]]]\"', '\"[1,2,4,3,5]\"', 1, '2025-11-01 12:20:37', '2025-11-12 19:26:54'),
(2, 'KAR', NULL, '\"[[[76.13958413348254,20.350136877225726],[77.20462440325339,20.248892472575605],[78.22508437680423,19.949435227954346],[79.1588240919547,19.46434608333393],[79.96831293339196,18.813801638725273],[80.62232239305422,18.024488460002654],[81.09704476395936,17.128258596910207],[81.37664989638525,16.160648003934444],[81.45337253399181,15.159360954274634],[81.32725832030006,14.162793054850574],[81.00569027798234,13.208634710219224],[80.50278406803366,12.332574279921294],[79.83869759940845,11.567109375364366],[79.03886370502332,10.94047496446869],[78.1331329995935,10.475704354764906],[77.15481075740101,10.189848462569547],[76.13958413348254,10.09338496966184],[75.12435750956409,10.189848462569547],[74.14603526737157,10.475704354764904],[73.24030456194177,10.940474964468688],[72.44047066755664,11.567109375364366],[71.77638419893142,12.332574279921293],[71.27347798898276,13.20863471021922],[70.95190994666501,14.16279305485057],[70.82579573297328,15.159360954274634],[70.90251837057984,16.160648003934444],[71.18212350300573,17.128258596910207],[71.65684587391085,18.02448846000265],[72.31085533357312,18.813801638725273],[73.12034417501037,19.46434608333393],[74.05408389016087,19.949435227954343],[75.07454386371168,20.248892472575605]],[[78.27532474518475,27.341831918062113],[79.3785049063145,27.24127098281441],[80.43393147141146,26.94398312806782],[81.39673267404893,26.462873688780093],[82.22743692264528,25.81855975741431],[82.89385913235112,25.03816043689696],[83.37223766645637,24.153821925957086],[83.64765599904204,23.20112562854983],[83.71388972782154,22.217501293504313],[83.57286272001221,21.24072713867543],[83.2338837223126,20.307559589511527],[82.71278892754268,19.4525063963434],[82.03106066337072,18.706741991688435],[81.21494523986976,18.0971614752342],[80.29456319798399,17.645575154626606],[79.30299437842534,17.368053853512233],[78.27532474518475,17.27444160201079],[77.24765511194414,17.368053853512233],[76.25608629238552,17.645575154626602],[75.33570425049976,18.097161475234195],[74.51958882699878,18.706741991688435],[73.83786056282683,19.4525063963434],[73.31676576805691,20.307559589511524],[72.97778677035728,21.240727138675428],[72.83675976254796,22.217501293504313],[72.90299349132745,23.20112562854983],[73.17841182391312,24.153821925957086],[73.65679035801837,25.03816043689696],[74.32321256772423,25.81855975741431],[75.15391681632056,26.462873688780093],[76.11671801895805,26.94398312806782],[77.17214458405499,27.24127098281441]],[[82.96076069914744,30.239000195593317],[83.68648418159943,30.175306565385217],[84.38171748267987,29.98691413194386],[85.0176092981022,29.68173974018921],[85.56842461902556,29.272498975423616],[86.01273190083693,28.776039586634077],[86.33422578253082,28.21250091685729],[86.52217110046747,27.604368869154932],[86.57150374279885,26.975491444568124],[86.482654342074,26.35010803392859],[86.26117046766899,25.751931024707112],[85.9172063738066,25.20330477147683],[85.46493365986159,24.72445685699533],[84.92190827567575,24.33285043995232],[84.3084139790578,24.042643686222867],[83.64679192669128,23.86426151298305],[82.96076069914744,23.804084770378726],[82.27472947160362,23.86426151298305],[81.61310741923708,24.042643686222867],[80.99961312261912,24.33285043995232],[80.45658773843329,24.72445685699533],[80.00431502448828,25.20330477147683],[79.66035093062588,25.751931024707112],[79.43886705622087,26.35010803392859],[79.35001765549602,26.975491444568124],[79.39935029782741,27.604368869154932],[79.58729561576405,28.21250091685729],[79.90878949745795,28.776039586634077],[80.35309677926932,29.272498975423616],[80.90391210019268,29.68173974018921],[81.53980391561498,29.98691413194386],[82.23503721669546,30.175306565385217]]]\"', '\"[1,2,4,5,3,6]\"', 1, '2025-12-06 13:32:37', '2025-12-19 18:20:09'),
(3, 'BENG', NULL, '\"[[[77.93359589308257,15.260697797021699],[78.39777367971676,15.21614137009565],[78.84357430494202,15.08423951678239],[79.25342150919577,14.870216411652272],[79.61129115339543,14.582523846136212],[79.9033695264377,14.232475882166538],[80.11858681949032,13.833769603390037],[80.24900735581242,13.4019189093308],[80.29007107056361,12.953629989524957],[80.24069088705676,12.506146414961297],[80.10321703098064,12.076589590302795],[79.88328214298579,11.681317547550115],[79.58954133262866,11.335322419480082],[79.23332045923308,11.0516847246418],[78.82818518906106,10.841100767926097],[78.38944354444129,10.711497696406477],[77.93359589308257,10.66774864950305],[77.47774824172383,10.711497696406479],[77.03900659710406,10.841100767926097],[76.63387132693204,11.051684724641797],[76.27765045353645,11.335322419480082],[75.98390964317932,11.681317547550114],[75.76397475518448,12.076589590302794],[75.62650089910836,12.506146414961297],[75.5771207156015,12.953629989524957],[75.6181844303527,13.4019189093308],[75.74860496667479,13.833769603390039],[75.96382225972742,14.232475882166536],[76.2559006327697,14.582523846136212],[76.61377027696935,14.870216411652272],[77.02361748122308,15.08423951678239],[77.46941810644834,15.21614137009565]],[[74.23120331495755,20.362161136873908],[75.12282806227174,20.277756235576508],[75.97759297027076,20.028053527357503],[76.76055051419281,19.623399229960828],[77.44039034993475,19.080425511790313],[77.99082989981888,18.42120161785283],[78.39159074139656,17.672165542323125],[78.62895232275046,16.862923636235497],[78.69593073400864,16.024996934564175],[78.59216037017907,15.190575509103686],[78.3235599804817,14.391322769655192],[77.90184919680149,13.657255887901469],[77.3439577177852,13.01571926331597],[76.67134664284424,12.490465282226813],[75.90924660016394,12.10085856301256],[75.08581293923184,11.861223406367854],[74.23120331495755,11.780356249539375],[73.37659369068328,11.861223406367857],[72.55316002975117,12.10085856301256],[71.79105998707088,12.490465282226811],[71.1184489121299,13.01571926331597],[70.56055743311363,13.657255887901467],[70.1388466494334,14.39132276965519],[69.87024625973604,15.190575509103684],[69.76647589590647,16.024996934564175],[69.83345430716466,16.862923636235497],[70.07081588851855,17.67216554232313],[70.47157673009623,18.42120161785283],[71.02201627998036,19.080425511790313],[71.70185611572231,19.623399229960828],[72.48481365964435,20.028053527357503],[73.33957856764337,20.277756235576508]],[[83.88325395198501,30.890057568838465],[85.31250548217953,30.76197555208476],[86.6767335890152,30.383645025421284],[87.91550658166095,29.772363581300837],[88.97684192111018,28.955546188980172],[89.81982760709276,27.968862131882897],[90.4158587513875,26.85405346222985],[90.74866321659326,25.656697325073807],[90.8134788345462,24.42410175803156],[90.61577895324076,23.203434434612927],[90.16986606886564,22.04010756969567],[89.4975289782517,20.976395463561037],[88.62683924550338,20.050245012608876],[87.59107639042811,19.294246339665108],[86.42772630321679,18.734749809776908],[85.17748948837134,18.391136943522206],[83.88325395198501,18.27526832108002],[82.58901841559869,18.391136943522206],[81.33878160075325,18.734749809776908],[80.17543151354194,19.294246339665108],[79.13966865846666,20.05024501260887],[78.26897892571833,20.976395463561037],[77.59664183510436,22.040107569695664],[77.15072895072926,23.203434434612927],[76.95302906942383,24.42410175803156],[77.01784468737678,25.656697325073807],[77.35064915258253,26.854053462229857],[77.94668029687726,27.968862131882894],[78.78966598285984,28.955546188980172],[79.85100132230907,29.772363581300837],[81.08977431495482,30.383645025421284],[82.45400242179049,30.76197555208476]]]\"', '\"[2]\"', 1, '2025-12-19 17:53:49', '2025-12-27 18:14:39');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int NOT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company_email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company_phone` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company_address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `logo` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('user','driver','admin') COLLATE utf8mb4_general_ci NOT NULL,
  `onboard_title_one` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `onboard_desc_one` text COLLATE utf8mb4_general_ci,
  `onboard_img_one` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `onboard_title_two` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `onboard_desc_two` text COLLATE utf8mb4_general_ci,
  `onboard_img_two` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gradient_direction` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'to right',
  `primary_gradient_start` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `primary_gradient_end` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `secondary_gradient_start` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `secondary_gradient_end` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `sidebar_gradient_start` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sidebar_gradient_end` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `hero_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `hero_title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `hero_is_text_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `ad1_images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `ad1_images_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `ad1_is_button_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `ad1_button_text` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ad1_link` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ad1_image_title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ad1_is_image_title_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `ad2_images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `ad2_images_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `ad2_is_button_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `ad2_button_text` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ad2_link` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ad2_image_title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ad2_is_image_title_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `privacy_policy` longtext COLLATE utf8mb4_general_ci,
  `consent_form` longtext COLLATE utf8mb4_general_ci,
  `fare_charges_policy` longtext COLLATE utf8mb4_general_ci COMMENT 'Fare and charges policies for driver',
  `reservation_policy` longtext COLLATE utf8mb4_general_ci COMMENT 'Reservation policies for admin',
  `commission_type` enum('percentage','fixed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'percentage',
  `book_any_vehicle` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'show',
  `subscription_activate` enum('yes','no') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'no' COMMENT 'Enable or disable subscription features in the app',
  `max_cancellations_per_day` int NOT NULL DEFAULT '3' COMMENT 'Maximum number of free cancellations allowed per driver per day',
  `max_cancellation_amt` decimal(8,2) NOT NULL DEFAULT '0.00' COMMENT 'Maximum cancellation amount',
  `cancellation_charge_percent` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'Percentage of ride amount to deduct from driver deposit after exceeding cancellation limit',
  `ranking_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Image for ranking screen/section',
  `leaderboard_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Image for leaderboard screen/section',
  `transfer_time_from` varchar(8) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Start time for allowed transfers (admin only)',
  `transfer_time_to` varchar(8) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'End time for allowed transfers (admin only)',
  `wallet_negative_limit` decimal(10,2) DEFAULT '0.00' COMMENT 'Maximum negative balance allowed for wallet (admin only)',
  `complain_assignable_roles` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `complain_escalation_roles` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `otp_provider` enum('msg91','combirds') COLLATE utf8mb4_general_ci DEFAULT 'msg91' COMMENT 'Selected OTP service provider'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `company_name`, `company_email`, `company_phone`, `company_address`, `logo`, `role`, `onboard_title_one`, `onboard_desc_one`, `onboard_img_one`, `onboard_title_two`, `onboard_desc_two`, `onboard_img_two`, `gradient_direction`, `primary_gradient_start`, `primary_gradient_end`, `secondary_gradient_start`, `secondary_gradient_end`, `sidebar_gradient_start`, `sidebar_gradient_end`, `hero_image`, `hero_title`, `hero_is_text_enabled`, `ad1_images`, `ad1_images_metadata`, `ad1_is_button_enabled`, `ad1_button_text`, `ad1_link`, `ad1_image_title`, `ad1_is_image_title_enabled`, `ad2_images`, `ad2_images_metadata`, `ad2_is_button_enabled`, `ad2_button_text`, `ad2_link`, `ad2_image_title`, `ad2_is_image_title_enabled`, `created_at`, `updated_at`, `privacy_policy`, `consent_form`, `fare_charges_policy`, `reservation_policy`, `commission_type`, `book_any_vehicle`, `subscription_activate`, `max_cancellations_per_day`, `max_cancellation_amt`, `cancellation_charge_percent`, `ranking_image`, `leaderboard_image`, `transfer_time_from`, `transfer_time_to`, `wallet_negative_limit`, `complain_assignable_roles`, `complain_escalation_roles`, `otp_provider`) VALUES
(1, 'Nefacabs', 'nirmal@techsaint.io', '6381455279', NULL, '1755675266948--1.jpeg', 'user', 'Huge savings: Upto to 60% off', 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. ', '1765361974941-Frame-2147223484.png', 'First ride Upto 30% off', 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. ', '1765361974941-Frame-2147223484.png', 'to left', '#2A65E7', '#2A65E7', '#000', '#000', NULL, NULL, '1765289691240-Frame-2147223473.png', '', 0, '[\"1767078404650-Card-1.png\"]', '[{\"name\":\"1767078404650-Card-1.png\",\"size\":255027}]', 0, NULL, NULL, NULL, 0, '[\"1767078404652-Card-2.png\"]', '[{\"name\":\"1767078404652-Card-2.png\",\"size\":169892}]', 0, NULL, NULL, NULL, 0, '2025-05-12 09:48:44', '2025-12-30 12:36:44', '<p><br></p>', '<p>sdsfsd</p>', NULL, NULL, 'percentage', 'show', 'no', 3, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'combirds'),
(2, 'Nefacabs', 'support@nefacabs.com', '8729808835', 'DSector,CourtStreetRoad,Naharlagun,ArunachalPradesh-7910', NULL, 'driver', 'Welcome', 'Drive, earn, and enjoy the freedom of flexible work.', '1749550059198-Rectangle-237.png', 'Sample Title', 'This is a sample description for onboarding step two.', 'sample-image-123.png', 'to right', '#000000', '#000000', '#00000', '#000000', NULL, NULL, NULL, NULL, 1, NULL, NULL, 1, NULL, NULL, NULL, 1, NULL, NULL, 1, NULL, NULL, NULL, 1, '2025-06-10 13:13:43', '2025-11-13 18:36:44', '<h1><br></h1>', '<p>dfdf</p>', '<p><br></p><p>The minimum base fare is applicable per trip, with charges as follows: For 2 Wheelers, the base fare is ₹40.00 with a waiting time charge of ₹1.09 per minute. For Auto, the base fare is ₹80.00 with a waiting charge of ₹1.29 per minute. For Mini, the base fare is ₹100.00 with a waiting charge of ₹2.49 per minute. For Comfort, the base fare is ₹150.00 with a waiting charge of ₹2.59 per minute, and for XL, the base fare is ₹200.00 with a waiting charge of ₹2.69 per minute.</p><p>Bata Charges (Night Time Allowance) are applicable between 9:00 PM to 5:00 AM, and the minimum base fare is applicable with rates as follows: 2 Wheeler – ₹1.99, Auto – ₹2.49, Mini – ₹2.49, Comfort – ₹2.99, and XL – ₹2.99.</p><p>Taxes: Applicable as per Government regulations including IGST, CGST, and SGST. The total fare is inclusive of these applicable taxes.</p><p>Exclusions: The total fare does not include tolls, MCD charges, or state taxes. Such charges, if applicable, are payable directly by the rider (client).</p><p>Peak Pricing: During periods of high demand, peak pricing may apply to ensure the availability of more cabs and the continued delivery of efficient service.</p><p>For any queries or complaints, please refer to the Terms &amp; Conditions section in the app or on the website.</p><p>Note: This is an electronically generated invoice and does not require a signature. All terms and conditions are available on <a href=\"https://www.nefacabs.com\" rel=\"noopener noreferrer\" target=\"_blank\">www.nefacabs.com</a>.</p>', NULL, 'percentage', 'show', 'no', 3, 0.00, 0.00, '1760006773984-nefa-banner-top-riders-copy-2-1.png', '1760006773984-nefa-banner-top-riders-copy-1.png', NULL, NULL, NULL, '', '', 'combirds'),
(3, 'Nefacabs', 'sds@gmail.com', '+916381455279', 'Yadavar St', '1761391541230-NEFA-trademark-horizontal-logo-white-1.png', 'admin', NULL, NULL, NULL, NULL, NULL, NULL, 'to bottom', '#032677', '#012e9a', '#032677', '#012e9a', '#032677', '#012e9a', NULL, NULL, 1, NULL, NULL, 1, NULL, NULL, NULL, 1, NULL, NULL, 1, NULL, NULL, NULL, 1, '2025-06-10 13:13:43', '2026-01-31 12:00:54', NULL, NULL, NULL, '<p>sdfsdf</p>', 'fixed', 'show', 'yes', 3, 2000.00, 2.00, NULL, NULL, '20:23', '23:23', 500.00, '1', '1,4', 'combirds');

-- --------------------------------------------------------

--
-- Table structure for table `sos`
--

CREATE TABLE `sos` (
  `id` int NOT NULL,
  `alert_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `ride_request_id` bigint DEFAULT NULL,
  `timestamp` datetime DEFAULT NULL,
  `status` enum('logged','resolved','false_alarm') COLLATE utf8mb4_general_ci DEFAULT 'logged',
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `notes` text COLLATE utf8mb4_general_ci,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `states`
--

CREATE TABLE `states` (
  `id` int NOT NULL,
  `state_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `state_code` varchar(5) COLLATE utf8mb4_general_ci NOT NULL,
  `capital` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `region` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `area_sq_km` decimal(10,2) DEFAULT NULL,
  `population` bigint DEFAULT NULL,
  `established_date` date DEFAULT NULL,
  `official_language` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `districts_count` int DEFAULT NULL,
  `status` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `states`
--

INSERT INTO `states` (`id`, `state_name`, `state_code`, `capital`, `region`, `area_sq_km`, `population`, `established_date`, `official_language`, `districts_count`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Andhra Pradesh', 'AP', 'Amaravati', 'South', 162968.00, 49386799, '1956-11-01', 'Telugu', 26, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(2, 'Arunachal Pradesh', 'AR', 'Itanagar', 'Northeast', 83743.00, 1382611, '1987-02-20', 'English', 25, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(3, 'Assam', 'AS', 'Dispur', 'Northeast', 78438.00, 31205576, '1947-08-15', 'Assamese', 35, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(4, 'Bihar', 'BR', 'Patna', 'East', 94163.00, 104099452, '1947-08-15', 'Hindi', 38, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(5, 'Chhattisgarh', 'CG', 'Raipur', 'Central', 135192.00, 25545198, '2000-11-01', 'Hindi', 33, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(6, 'Goa', 'GA', 'Panaji', 'West', 3702.00, 1458545, '1987-05-30', 'Konkani', 2, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(7, 'Gujarat', 'GJ', 'Gandhinagar', 'West', 196244.00, 60439692, '1960-05-01', 'Gujarati', 33, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(8, 'Haryana', 'HR', 'Chandigarh', 'North', 44212.00, 25351462, '1966-11-01', 'Hindi', 22, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(9, 'Himachal Pradesh', 'HP', 'Shimla', 'North', 55673.00, 6864602, '1971-01-25', 'Hindi', 12, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(10, 'Jharkhand', 'JH', 'Ranchi', 'East', 79716.00, 32988134, '2000-11-15', 'Hindi', 24, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(11, 'Karnataka', 'KA', 'Bengaluru', 'South', 191791.00, 61095297, '1956-11-01', 'Kannada', 31, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(12, 'Kerala', 'KL', 'Thiruvananthapuram', 'South', 38852.00, 33406061, '1956-11-01', 'Malayalam', 14, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(13, 'Madhya Pradesh', 'MP', 'Bhopal', 'Central', 308252.00, 72626809, '1956-11-01', 'Hindi', 55, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(14, 'Maharashtra', 'MH', 'Mumbai', 'West', 307713.00, 112374333, '1960-05-01', 'Marathi', 36, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(15, 'Manipur', 'MN', 'Imphal', 'Northeast', 22327.00, 2855794, '1972-01-21', 'Meitei', 16, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(16, 'Meghalaya', 'ML', 'Shillong', 'Northeast', 22429.00, 2966889, '1972-01-21', 'English', 12, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(17, 'Mizoram', 'MZ', 'Aizawl', 'Northeast', 21081.00, 1097206, '1987-02-20', 'Mizo', 11, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(18, 'Nagaland', 'NL', 'Kohima', 'Northeast', 16579.00, 1978502, '1963-12-01', 'English', 16, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(19, 'Odisha', 'OR', 'Bhubaneswar', 'East', 155707.00, 42000000, '1936-04-01', 'Odia', 30, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(20, 'Punjab', 'PB', 'Chandigarh', 'North', 50362.00, 27743338, '1966-11-01', 'Punjabi', 23, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(21, 'Rajasthan', 'RJ', 'Jaipur', 'West', 342239.00, 68548437, '1956-11-01', 'Hindi', 50, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(22, 'Sikkim', 'SK', 'Gangtok', 'Northeast', 7096.00, 610577, '1975-05-16', 'English', 6, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(23, 'Tamil Nadu', 'TN', 'Chennai', 'South', 130060.00, 72147030, '1956-11-01', 'Tamil', 38, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(24, 'Telangana', 'TS', 'Hyderabad', 'South', 112077.00, 35003674, '2014-06-02', 'Telugu', 33, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(25, 'Tripura', 'TR', 'Agartala', 'Northeast', 10486.00, 3673917, '1972-01-21', 'Bengali', 8, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(26, 'Uttar Pradesh', 'UP', 'Lucknow', 'North', 240928.00, 199812341, '1947-08-15', 'Hindi', 75, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(27, 'Uttarakhand', 'UK', 'Dehradun', 'North', 53483.00, 10086292, '2000-11-09', 'Hindi', 13, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19'),
(28, 'West Bengal', 'WB', 'Kolkata', 'East', 88752.00, 91276115, '1947-08-15', 'Bengali', 23, 1, '2025-09-20 10:45:19', '2025-09-20 10:45:19');

-- --------------------------------------------------------

--
-- Table structure for table `subcategory_complaints`
--

CREATE TABLE `subcategory_complaints` (
  `id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  `subcategory` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0=Inactive, 1=Active',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subcategory_complaints`
--

INSERT INTO `subcategory_complaints` (`id`, `category_id`, `subcategory`, `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(2, 1, 'Driver refused destination', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(3, 1, 'Driver asked for extra money', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(4, 1, 'Driver used abusive language', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(5, 1, 'Driver was not cooperative', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(6, 2, 'Driver drove rashly', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(7, 2, 'Driver was on call while driving', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(8, 2, 'Driver was drunk', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(9, 2, 'Unsafe route taken', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(10, 3, 'Fare was higher than shown', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(11, 3, 'Driver charged extra', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(12, 3, 'Incorrect surge pricing', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(13, 3, 'Paid online but driver asked cash', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(14, 4, 'Driver ignored GPS', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(15, 4, 'Driver intentionally took long route', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(16, 4, 'Driver missed turns repeatedly', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(17, 5, 'Car was dirty', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(18, 5, 'AC not working', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(19, 5, 'Bad smell inside vehicle', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(20, 5, 'Vehicle not matching the app details', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(21, 6, 'Driver cancelled after asking destination', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(22, 6, 'Driver never showed up', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(23, 6, 'Driver cancelled at last minute', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(24, 7, 'Online payment failed', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(25, 7, 'Refund not received', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(26, 7, 'Driver demanded cash instead of online', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(27, 7, 'Double payment charged', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(28, 8, 'Left phone in cab', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(29, 8, 'Left wallet in cab', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(30, 8, 'Left bag/luggage in cab', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(31, 8, 'Driver not responding about lost item', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(32, 9, 'App crashed during booking', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(33, 9, 'Location not updating correctly', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(34, 9, 'Payment gateway error', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(35, 9, 'OTP not received', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(36, 10, 'Driver took too long to arrive', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(37, 10, 'Driver stopped far from pickup point', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(38, 10, 'Multiple drivers cancelled before arrival', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(39, 11, 'Support took too long to respond', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(40, 11, 'Support provided wrong information', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(41, 11, 'Support agent was rude', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(42, 12, 'Issue not listed', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(43, 12, 'General feedback', NULL, 1, 1, NULL, '2025-11-22 05:23:01', '2025-11-22 05:23:01'),
(44, 2, 'nhah', NULL, 1, 1, 1, '2025-12-06 09:38:02', '2025-12-06 09:38:02');

-- --------------------------------------------------------

--
-- Table structure for table `subscription_plans`
--

CREATE TABLE `subscription_plans` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Plan name (e.g., Basic, Premium, Gold)',
  `description` text COLLATE utf8mb4_general_ci COMMENT 'Plan description and benefits',
  `price` decimal(10,2) NOT NULL COMMENT 'Subscription price',
  `duration_type` enum('days','rides') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'days' COMMENT 'Subscription type: days or ride count',
  `duration_value` int NOT NULL COMMENT 'Number of days or rides included',
  `commission_waiver` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether commission is waived (1=yes, 0=no)',
  `max_daily_rides` int DEFAULT NULL COMMENT 'Maximum rides per day (NULL = unlimited)',
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'JSON array of plan features',
  `is_popular` tinyint(1) DEFAULT '0' COMMENT 'Mark as popular plan',
  `sort_order` int DEFAULT '0' COMMENT 'Display order',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `status` enum('active','inactive','archived') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Subscription plan definitions';

--
-- Dumping data for table `subscription_plans`
--

INSERT INTO `subscription_plans` (`id`, `name`, `description`, `price`, `duration_type`, `duration_value`, `commission_waiver`, `max_daily_rides`, `features`, `is_popular`, `sort_order`, `created_at`, `created_by`, `updated_at`, `updated_by`, `status`) VALUES
(1, 'Basic - 7 Days', 'Zero commission for 7 days', 299.00, 'days', 7, 1, NULL, NULL, 0, 1, '2025-12-13 21:39:08', NULL, '2025-12-13 22:14:57', NULL, 'active'),
(2, 'Standard - 30 Days', 'Zero commission for 30 days', 999.00, 'days', 30, 1, NULL, NULL, 1, 2, '2025-12-13 21:39:57', NULL, '2025-12-13 21:40:06', NULL, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `subscription_usage_history`
--

CREATE TABLE `subscription_usage_history` (
  `id` bigint NOT NULL,
  `subscription_id` bigint NOT NULL,
  `ride_request_id` bigint NOT NULL,
  `used_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `commission_saved` decimal(10,2) DEFAULT '0.00' COMMENT 'Commission amount saved on this ride',
  `ride_fare` decimal(10,2) DEFAULT '0.00' COMMENT 'Ride fare for reference',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tracks subscription usage per ride';

-- --------------------------------------------------------

--
-- Table structure for table `trips`
--

CREATE TABLE `trips` (
  `id` int NOT NULL,
  `trip` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `trips`
--

INSERT INTO `trips` (`id`, `trip`, `image`, `created_at`, `updated_at`, `status`) VALUES
(1, 'One way', '1767078466943-New-1-1.png', '2025-05-16 11:08:14', '2025-12-30 12:37:46', 1),
(2, 'Round trip', '1767078572158-round-trip-export-2-1.png', '2025-05-16 11:08:14', '2025-12-30 12:39:32', 1),
(3, 'Reserve', '1767078552341-Group-1000001333-2.png', '2025-05-16 11:08:14', '2025-12-30 12:39:12', 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `mobile` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `gender` enum('Male','Female','Others') COLLATE utf8mb4_general_ci NOT NULL,
  `profile` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fcm_token` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `remember_token` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` int NOT NULL DEFAULT '1',
  `pending_cancellation_charge` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Pending cancellation charge to be deducted from next ride'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `gender`, `profile`, `password`, `fcm_token`, `remember_token`, `created_at`, `updated_at`, `status`, `pending_cancellation_charge`) VALUES
(1, 'Techsaint Technology', 'info@techsaint.io', '6381455279', 'Male', NULL, '$2b$10$MUZW5F8vJbydnJj41t0esehDhv8V89d9wpID39ptHKFUk0W4cAiSy', 'eUGsreoDMve4wHgp4iYdqN:APA91bH6hJBu_afe_fFVpAgxzGUb0cDEe-s-eIJLwoR1qBHnKAdFnLaE2KaSDiYe7okVqcSu3TGQnrIz_-zOPwkYiaHXBpDPgfrp4SboCw4l5YtIfrf0SKU', NULL, '2025-12-12 08:20:53', '2026-01-31 15:04:41', 1, 0.00),
(40, 'Tusertest', 'usertest@gmail.com', '7905184978', 'Male', NULL, '', 'cRd39OW5TlGmaLhSYu8wPO:APA91bHJyQ8Q0mKlQmItxedkgr2pvVYdzWpQsP4MWNzI-cYNgK01Ywu1ARDTqIYhfZpV8yB80Vivyu7bdOTgc50fyGyo0xzM8q3Vki1VYDdeQQ-nkPr--xM', NULL, '2025-12-11 16:23:51', '2025-12-11 16:23:51', 1, 0.00),
(41, 'S', 'rr@gmail.com', '7699000006', 'Male', NULL, '', 'c7lliyKgRha_pAhjVzAobG:APA91bGog0lRHhFTuSWJY0nqVgqNlJZcDelQAOU93tIA800OEUoQbNIp93tS8JyB3IvL_ZwFCks5afN762IW5gd6DLVKBACR1XEt14iMUlE0fPbrEWFs8mA', NULL, '2025-12-12 12:57:12', '2025-12-16 12:04:30', 1, 0.00),
(42, 'Nirmal', 'nirmal@techsaint.io', '6381240119', 'Male', 'driver_face_image-1765722067695-375387515-compressed1765722065693.jpg', '', 'fjbrlu8rQ0Cu64gR0wxhOu:APA91bGPzjw_Wee4A5IQOOfca6wZhl0BNIMwfLo8GoN2zRsG_7DLKPKovijGwm5ud1Cd9NbiiwYfiZ6Q19OjdZjKxoioCAP9XzihZc4T6uabcJ8DKBmo238', NULL, '2025-12-14 19:51:07', '2025-12-30 12:42:13', 1, 0.00),
(43, 'Pradeep', 'pradeep@techsiant.io', '8220222834', 'Male', 'driver_face_image-1765729169184-501220930-compressed1765729166601.jpg', '', 'fjbrlu8rQ0Cu64gR0wxhOu:APA91bGPzjw_Wee4A5IQOOfca6wZhl0BNIMwfLo8GoN2zRsG_7DLKPKovijGwm5ud1Cd9NbiiwYfiZ6Q19OjdZjKxoioCAP9XzihZc4T6uabcJ8DKBmo238', NULL, '2025-12-14 21:49:29', '2025-12-20 13:33:11', 1, 0.00),
(45, 'Lamrin', 'lamrin67@gmail.com', '8015911420', 'Male', 'driver_face_image-1765803027536-486513873-compressed1765803025253.jpg', '', 'dYBNSLdhSMuaEwZwMxI0VS:APA91bHZFf23_jiu4q89tqrvXrMO5nND7ZbYAlnvrpJM_J8ghCQaT90m2VKymfo06fcz3WI-dpLXL_0mDGBxPDGy8I5TDrF-K9paUQNsAi-iYElkNZYWvOU', NULL, '2025-12-15 18:20:27', '2025-12-26 16:19:44', 1, 0.00),
(46, 'Ayz79', 'ayu@gmail.com', '7905184978', 'Male', 'driver_face_image-1767008251737-49485068-compressed1767008250177.jpg', '', 'dY5bZVlRRmG23kgNPcebZC:APA91bH6M-Cp_Mwd4_UQL8PQwaCNC1a5PoWD4lxydGxJz7oxCkLQFBOCZTaoDzJR6pUNT_1wt_vxflVRCW0nC1dqUJLyB1uWeVOaBYt3b0R62yiMAbN76S4', NULL, '2025-12-29 17:07:31', '2026-01-24 17:03:31', 1, 0.00),
(47, 'Dar', 'dg@gmail.com', '8105489311', 'Male', NULL, '', 'dcJkJvCdTcepy9Hnvxo2Xj:APA91bFmgtAjITvXzcPD_nxnpF8WYCPvEn9zx8Nj6hfWYGFQvPIZG8SynH51P095ZQLo9FyBcCwZVcmxUI2p6V7MSFEKcT1DwEYwiC7TabpKxv-FYaEgsZg', NULL, '2025-12-30 12:23:51', '2026-01-21 16:48:12', 1, 0.00),
(48, 'Mani', 'manibharathigps@gmail.com', '7502558479', 'Male', NULL, '', 'eKc9t4GlSjyDdZZbwaEXoB:APA91bHEpQ4JV_fgR-jVk0d13VS7ZM2s4Y7X1FQJTAeyAgO5ARSJePPyBRuHTdTySFNDr8S2z1JAZs9cy6bLWREke9_z4KxjjGFrwmMBafh8W3iU5iQU3VA', NULL, '2026-01-09 13:13:59', '2026-01-09 13:13:59', 1, 0.00),
(50, 'Abhy', 'abhay@gmail.com', '8358961669', 'Male', 'driver_face_image-1768807891448-60131688-compressed1768807888923.jpg', '', 'fM23s4VASYSOpA-kzqdU3S:APA91bFIGKooe2SzKtvwMsDKgiBD3vEzbFP-LCOReHq9X_POsoc8URRtsQYPDN4Zh7N7J2A-DY4PvEbXZMzd4nXo4iuL0z7myge0PEdpyJRIOwuaUuR7JC4', NULL, '2026-01-19 13:01:31', '2026-01-31 16:58:28', 1, 0.00),
(51, 'Test user', 'test@gmail.com', '8358961669', 'Male', '1769838327406--1.jpeg', '', 'dMrQJdUTQKK3vKXsxH8cn9:APA91bFwwHnXkRbpD5hye-wVd98kf6zwac3M_OqPhGlNkjO7XGPXQsNSItZGzkx-ZyRaqJeYZoVEkL63BClGtkWhc-5fpjNTqryF3f6-K4XFLDvZMVfSNx0', NULL, '2026-01-20 12:33:16', '2026-01-31 11:15:27', 1, 0.00),
(53, 'Driver73', 'drives73@gmail.com', '9918821973', 'Male', 'driver_face_image-1769252825453-615700439-compressed1769252823650.jpg', '', 'dY5bZVlRRmG23kgNPcebZC:APA91bH6M-Cp_Mwd4_UQL8PQwaCNC1a5PoWD4lxydGxJz7oxCkLQFBOCZTaoDzJR6pUNT_1wt_vxflVRCW0nC1dqUJLyB1uWeVOaBYt3b0R62yiMAbN76S4', NULL, '2026-01-24 16:37:05', '2026-01-24 16:37:05', 1, 0.00),
(54, 'Nirmal', 'nirmalbalaji@techsaint.io', '9360752727', 'Male', 'driver_face_image-1769793935041-34269626-compressed1769793932498.jpg', '', 'c7Vi3LXlTBCQ5sVZGfTsi-:APA91bHSC6clCEEyFvZxCJvngcbi7oIzPImXazH1hfp-VWHVsXCgXeT1WVfRSR7N6EltmWCyPQfzW_IEwlgsfX1xR1SX2a4mJ24Mf0zYPYUj3b-UY2f_VQ8', NULL, '2026-01-30 22:55:35', '2026-01-31 10:45:05', 1, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `user_coupons`
--

CREATE TABLE `user_coupons` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `promo_id` int NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `valid_until` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `role_id` int NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `is_primary`, `created_at`, `updated_at`) VALUES
(1, 1, 6, 1, '2025-11-01 06:13:15', '2025-11-01 06:13:15'),
(14, 14, 3, 1, '2025-12-03 16:14:32', '2025-12-03 16:14:32'),
(15, 15, 2, 1, '2025-12-06 11:42:12', '2025-12-06 11:42:12'),
(16, 16, 3, 1, '2025-12-06 11:46:52', '2025-12-06 11:46:52'),
(17, 17, 2, 1, '2025-12-06 16:00:24', '2025-12-06 16:00:24'),
(18, 18, 2, 1, '2025-12-06 18:27:41', '2025-12-06 18:27:41'),
(19, 19, 2, 1, '2025-12-08 15:15:23', '2025-12-08 15:15:23'),
(20, 21, 3, 1, '2025-12-08 15:34:30', '2025-12-08 15:34:30'),
(21, 22, 3, 1, '2025-12-08 15:55:19', '2025-12-08 15:55:19'),
(22, 23, 3, 1, '2025-12-08 16:25:31', '2025-12-08 16:25:31'),
(23, 24, 3, 1, '2025-12-08 16:35:34', '2025-12-08 16:35:34'),
(24, 25, 3, 1, '2025-12-08 16:36:26', '2025-12-08 16:36:26'),
(25, 26, 3, 1, '2025-12-08 16:55:33', '2025-12-08 16:55:33'),
(26, 27, 3, 1, '2025-12-08 17:12:17', '2025-12-08 17:12:17'),
(27, 28, 3, 1, '2025-12-08 17:24:21', '2025-12-08 17:24:21'),
(28, 29, 3, 1, '2025-12-08 18:30:25', '2025-12-08 18:30:25'),
(29, 30, 2, 1, '2025-12-08 21:33:03', '2025-12-08 21:33:03'),
(30, 32, 3, 1, '2025-12-09 11:15:17', '2025-12-09 11:15:17'),
(31, 33, 2, 1, '2025-12-09 13:08:46', '2025-12-09 13:08:46'),
(32, 34, 2, 1, '2025-12-09 13:16:39', '2025-12-09 13:16:39'),
(33, 35, 2, 1, '2025-12-09 15:01:48', '2025-12-09 15:01:48'),
(34, 37, 3, 1, '2025-12-09 18:02:08', '2025-12-09 18:02:08'),
(35, 38, 2, 1, '2025-12-09 19:01:45', '2025-12-09 19:01:45'),
(36, 39, 3, 1, '2025-12-10 10:29:12', '2025-12-10 10:29:12'),
(37, 40, 2, 1, '2025-12-11 16:23:51', '2025-12-11 16:23:51'),
(38, 41, 2, 1, '2025-12-12 12:57:12', '2025-12-12 12:57:12'),
(39, 42, 3, 1, '2025-12-14 19:51:07', '2025-12-14 19:51:07'),
(40, 43, 3, 1, '2025-12-14 21:49:29', '2025-12-14 21:49:29'),
(41, 44, 3, 1, '2025-12-15 18:13:29', '2025-12-15 18:13:29'),
(42, 45, 3, 1, '2025-12-15 18:20:27', '2025-12-15 18:20:27'),
(43, 46, 3, 1, '2025-12-29 17:07:31', '2025-12-29 17:07:31'),
(44, 47, 2, 1, '2025-12-30 12:23:51', '2025-12-30 12:23:51'),
(45, 48, 2, 1, '2026-01-09 13:13:59', '2026-01-09 13:13:59'),
(46, 49, 3, 1, '2026-01-10 00:56:29', '2026-01-10 00:56:29'),
(47, 50, 3, 1, '2026-01-19 13:01:31', '2026-01-19 13:01:31'),
(48, 51, 2, 1, '2026-01-20 12:33:16', '2026-01-20 12:33:16'),
(49, 52, 3, 1, '2026-01-23 15:32:02', '2026-01-23 15:32:02'),
(50, 53, 3, 1, '2026-01-24 16:37:05', '2026-01-24 16:37:05'),
(51, 54, 3, 1, '2026-01-30 22:55:35', '2026-01-30 22:55:35');

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'e.g., Bike, Car, Auto',
  `image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `deposit` int NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`id`, `name`, `image`, `deposit`, `description`, `created_at`, `updated_at`, `status`) VALUES
(1, 'Bike', '1766055367135-image-59-1.png', 500, 'Economics', '2025-11-01 11:52:33', '2025-12-18 16:26:07', 1),
(2, 'Auto', '1766142218434-image-60-3.png', 1000, 'Effortless Ride Everytime', '2025-11-01 11:53:39', '2025-12-19 16:33:38', 1),
(3, 'Car', '1766055385787-image-62-1.png', 1500, 'Perfect Urban Companion', '2025-11-01 11:54:44', '2025-12-18 16:26:25', 1),
(4, 'Scooty', '1766055399767-image-58-1.png', 400, 'For easy ride', '2025-12-08 12:39:15', '2025-12-18 16:26:39', 1);

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_prices`
--

CREATE TABLE `vehicle_prices` (
  `id` int NOT NULL,
  `vehicle_id` int NOT NULL,
  `vehicle_type_id` int NOT NULL COMMENT 'Foreign key referencing vehicle_types(id)',
  `trip_id` int NOT NULL COMMENT 'Foreign key referencing trips(id)',
  `intercity_base_fare` decimal(10,2) DEFAULT '0.00' COMMENT 'Base Price for Intercity',
  `intercity_per_km_charges` decimal(10,2) DEFAULT '0.00' COMMENT 'Charge per KM for Intercity',
  `intercity_waiting_charges` decimal(10,2) DEFAULT '0.00' COMMENT 'Waiting Time charge for Intercity',
  `intercity_bata_charges` decimal(10,2) DEFAULT '0.00' COMMENT 'Bata Charges for Intercity',
  `intercity_minimum_fare` decimal(10,2) DEFAULT '0.00' COMMENT 'Base Minimum for Intercity',
  `outstation_base_fare` decimal(10,2) DEFAULT '0.00' COMMENT 'Base Price for Outstation',
  `outstation_per_km_charges` decimal(10,2) DEFAULT '0.00' COMMENT 'Charge per KM for Outstation',
  `outstation_waiting_charges` decimal(10,2) DEFAULT '0.00' COMMENT 'Waiting Time charge for Outstation',
  `outstation_bata_charges` decimal(10,2) DEFAULT '0.00' COMMENT 'Bata Charges for Outstation',
  `outstation_minimum_fare` decimal(10,2) DEFAULT '0.00' COMMENT 'Minimum Price for Outstation',
  `round_intercity_base_fare` decimal(10,2) DEFAULT '0.00' COMMENT 'Base Price for Round Trip Intercity',
  `round_intercity_per_km_charges` decimal(10,2) DEFAULT '0.00' COMMENT 'Charge per KM for Round Trip Intercity',
  `round_intercity_waiting_charges` decimal(10,2) DEFAULT '0.00' COMMENT 'Waiting Time for Round Trip Intercity',
  `round_intercity_minimum_fare` decimal(10,2) DEFAULT NULL COMMENT 'Minimum Price for Round Trip Intercity',
  `round_intercity_bata_charges` decimal(10,2) DEFAULT '0.00' COMMENT 'Bata Charges for Intercity',
  `round_outstation_base_fare` decimal(10,2) DEFAULT NULL COMMENT 'Base Price for Round Trip Outstation',
  `round_outstation_per_km_charges` decimal(10,2) DEFAULT NULL COMMENT 'Charge per KM for Round Trip Outstation',
  `round_outstation_waiting_charges` decimal(10,2) DEFAULT NULL COMMENT 'Waiting Time for Round Trip Outstation',
  `round_outstation_minimum_fare` decimal(10,2) DEFAULT NULL COMMENT 'Minimum Price for Round Trip Outstation',
  `reservation_base_fare` decimal(10,2) DEFAULT NULL COMMENT 'Base Price for Reservation',
  `reservation_per_km_charges` decimal(10,2) DEFAULT NULL COMMENT 'Charge per KM for Reservation',
  `bata_time_start` time DEFAULT '21:00:00' COMMENT 'Bata Time Starts (9 PM)',
  `bata_time_end` time DEFAULT '05:00:00' COMMENT 'Bata Time Ends (5 AM)',
  `updated_pricing_at` datetime DEFAULT NULL COMMENT 'Last pricing update timestamp',
  `state_id` int NOT NULL COMMENT 'Foreign key referencing states(id)',
  `package_id` int DEFAULT NULL,
  `igst_rate` decimal(5,2) NOT NULL DEFAULT '5.00' COMMENT 'IGST rate percentage (e.g., 5.00 for 5%)',
  `cgst_rate` decimal(5,2) NOT NULL DEFAULT '2.50' COMMENT 'CGST rate percentage (e.g., 2.50 for 2.5%)',
  `sgst_rate` decimal(5,2) NOT NULL DEFAULT '2.50' COMMENT 'SGST rate percentage (e.g., 2.50 for 2.5%)',
  `max_km` int DEFAULT NULL COMMENT 'Maximum km limit (not applicable for reserve trips)',
  `outstation_km` int DEFAULT NULL COMMENT 'Outstation km threshold (not applicable for reserve trips)',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicle_prices`
--

INSERT INTO `vehicle_prices` (`id`, `vehicle_id`, `vehicle_type_id`, `trip_id`, `intercity_base_fare`, `intercity_per_km_charges`, `intercity_waiting_charges`, `intercity_bata_charges`, `intercity_minimum_fare`, `outstation_base_fare`, `outstation_per_km_charges`, `outstation_waiting_charges`, `outstation_bata_charges`, `outstation_minimum_fare`, `round_intercity_base_fare`, `round_intercity_per_km_charges`, `round_intercity_waiting_charges`, `round_intercity_minimum_fare`, `round_intercity_bata_charges`, `round_outstation_base_fare`, `round_outstation_per_km_charges`, `round_outstation_waiting_charges`, `round_outstation_minimum_fare`, `reservation_base_fare`, `reservation_per_km_charges`, `bata_time_start`, `bata_time_end`, `updated_pricing_at`, `state_id`, `package_id`, `igst_rate`, `cgst_rate`, `sgst_rate`, `max_km`, `outstation_km`, `created_at`, `updated_at`, `status`) VALUES
(1, 3, 4, 3, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, 200.00, 11.00, '21:00:00', '05:00:00', NULL, 11, 1, 5.00, 2.50, 2.50, NULL, NULL, '2025-11-01 12:03:28', '2025-11-01 12:03:28', 1),
(3, 3, 5, 1, 200.00, 20.00, 12.00, 20.00, 250.00, 200.00, 20.00, 12.00, 20.00, 250.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, '21:00:00', '05:00:00', '2025-11-12 19:24:17', 11, NULL, 5.00, 2.50, 2.50, 100, 100, '2025-11-12 19:13:36', '2025-11-12 19:24:17', 1),
(5, 1, 2, 1, 50.00, 12.00, 1.00, 12.00, 70.00, 250.00, 12.00, 10.00, 10.00, 270.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, '21:00:00', '05:00:00', '2025-11-12 19:25:45', 11, NULL, 5.00, 2.50, 2.50, 100, 100, '2025-11-12 19:22:54', '2025-11-12 19:25:45', 1),
(6, 3, 3, 1, 100.00, 10.00, 2.00, 20.00, 100.00, 100.00, 10.00, 10.00, 10.00, 100.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, '21:00:00', '05:00:00', NULL, 11, NULL, 5.00, 2.50, 2.50, 200, 10, '2025-12-08 12:25:44', '2025-12-08 12:25:44', 1),
(7, 3, 4, 1, 100.00, 10.00, 20.00, 10.00, 100.00, 200.00, 10.00, 10.00, 10.00, 200.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, '21:00:00', '05:00:00', NULL, 11, NULL, 5.00, 2.50, 2.50, 100, 10, '2025-12-08 12:27:37', '2025-12-08 12:27:37', 1),
(8, 4, 6, 1, 100.00, 10.00, 2.00, 2.00, 100.00, 100.00, 10.00, 10.00, 20.00, 120.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, '21:00:00', '05:00:00', NULL, 11, NULL, 5.00, 2.50, 2.50, 50, 10, '2025-12-08 12:55:14', '2025-12-08 12:55:14', 1),
(9, 3, 3, 2, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 200.00, 10.00, 10.00, 200.00, 10.00, 200.00, 10.00, 10.00, 200.00, NULL, NULL, '21:00:00', '05:00:00', '2025-12-08 13:18:26', 11, NULL, 5.00, 2.50, 2.50, 200, 20, '2025-12-08 13:16:27', '2025-12-08 13:18:26', 1),
(10, 3, 5, 2, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 100.00, 10.00, 10.00, 100.00, 20.00, 200.00, 10.00, 10.00, 250.00, NULL, NULL, '21:00:00', '05:00:00', NULL, 11, NULL, 5.00, 2.50, 2.50, 100, 100, '2025-12-08 13:17:47', '2025-12-08 13:17:47', 1),
(11, 3, 4, 2, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 200.00, 10.00, 10.00, 200.00, 10.00, 200.00, 10.00, 10.00, 200.00, NULL, NULL, '21:00:00', '05:00:00', NULL, 11, NULL, 5.00, 2.50, 2.50, 100, 10, '2025-12-08 13:21:11', '2025-12-08 13:21:11', 1),
(13, 3, 5, 3, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, 200.00, 10.00, '21:00:00', '05:00:00', NULL, 11, 1, 5.00, 2.50, 2.50, NULL, NULL, '2025-12-09 14:56:44', '2025-12-09 14:56:44', 1),
(14, 3, 3, 3, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, 200.00, 20.00, '21:00:00', '05:00:00', '2025-12-24 17:43:30', 11, 2, 5.00, 2.50, 2.50, NULL, NULL, '2025-12-09 14:57:22', '2025-12-24 17:43:30', 1),
(16, 2, 1, 1, 100.00, 12.00, 12.00, 20.00, 120.00, 200.00, 20.00, 20.00, 23.00, 230.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, '21:00:00', '05:00:00', NULL, 11, NULL, 5.00, 2.50, 2.50, 93, 19, '2025-12-30 18:52:40', '2025-12-30 18:52:40', 1),
(17, 1, 2, 1, 100.00, 10.00, 1.00, 1.00, 110.00, 200.00, 12.00, 4.00, 6.00, 250.00, 0.00, 0.00, 0.00, NULL, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, '21:00:00', '05:00:00', '2026-01-13 17:30:43', 23, NULL, 6.00, 3.00, 3.00, 100, 100, '2025-12-30 18:55:13', '2026-01-13 17:30:43', 1);

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_types`
--

CREATE TABLE `vehicle_types` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `image` text COLLATE utf8mb4_general_ci,
  `map_image` text COLLATE utf8mb4_general_ci,
  `animation` text COLLATE utf8mb4_general_ci,
  `description` text COLLATE utf8mb4_general_ci,
  `vehicle_id` int NOT NULL,
  `capacity` int NOT NULL,
  `commission` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicle_types`
--

INSERT INTO `vehicle_types` (`id`, `name`, `image`, `map_image`, `animation`, `description`, `vehicle_id`, `capacity`, `commission`, `created_at`, `updated_at`, `status`) VALUES
(2, 'Bike', '1765972651966-image-59-1.png', '1765972651966-Bike.png', '1765972651966-Bike-GIf.gif', 'Premium', 1, 1, 100.00, '2025-11-01 11:58:54', '2026-01-31 12:01:07', 1),
(3, 'Mini', '1765972855710-image-61-1.png', '1765972855711-Comfort.png', '1765972855711-Carinacity20251209101455.gif', 'Perfect Urban Companion', 3, 4, 130.00, '2025-11-01 11:59:46', '2026-01-31 12:01:24', 1),
(4, 'Cab XL', '1765972733197-image-63-1.png', '1765972733198-XL.png', '1765972733198-Carinacity20251209101455.gif', 'Bold Spacious Ride', 3, 7, 110.00, '2025-11-01 12:02:45', '2026-01-31 12:01:12', 1),
(5, 'COMFORT', '1765972782850-image-62-1.png', '1765972782850-Mini.png', '1765972782850-Carinacity20251209101455.gif', 'For comfort ride', 3, 4, 120.00, '2025-11-12 19:12:04', '2026-01-31 12:01:18', 1),
(6, 'Scooty', '1765972682932-image-58-1.png', '1765972682932-Bike-3.png', '1765972682932-Bike-GIf.gif', 'For easy ride', 4, 1, 140.00, '2025-12-08 12:46:19', '2026-01-31 12:01:28', 1);

-- --------------------------------------------------------

--
-- Table structure for table `wallets`
--

CREATE TABLE `wallets` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  `reserved_balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_earned` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_spent` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(3) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'INR',
  `status` enum('active','inactive','frozen') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `wallets`
--

INSERT INTO `wallets` (`id`, `user_id`, `balance`, `reserved_balance`, `total_earned`, `total_spent`, `currency`, `status`, `created_at`, `updated_at`) VALUES
(1, 16, 100.00, 0.00, 0.00, 0.00, 'INR', 'active', '2025-12-06 13:26:00', '2025-12-06 13:28:00'),
(2, 32, -19.90, 0.00, 0.00, 0.00, 'INR', 'active', '2025-12-09 11:20:00', '2025-12-09 17:08:41'),
(3, 37, -48.22, 0.00, 0.00, 0.00, 'INR', 'active', '2025-12-09 18:02:08', '2025-12-09 19:06:14'),
(4, 39, -57.41, 0.00, 0.00, 0.00, 'INR', 'active', '2025-12-10 10:29:12', '2025-12-11 10:41:40'),
(5, 42, 0.00, 0.00, 0.00, 0.00, 'INR', 'active', '2025-12-14 19:51:07', '2025-12-14 19:51:07'),
(6, 43, 0.00, 0.00, 0.00, 0.00, 'INR', 'active', '2025-12-14 21:49:29', '2025-12-14 21:49:29'),
(7, 44, 0.00, 0.00, 0.00, 0.00, 'INR', 'active', '2025-12-15 18:13:29', '2025-12-15 18:13:29'),
(8, 45, 0.00, 0.00, 0.00, 0.00, 'INR', 'active', '2025-12-15 18:20:27', '2025-12-15 18:20:27'),
(9, 46, -17.32, 0.00, 0.00, 0.00, 'INR', 'active', '2025-12-29 17:07:31', '2025-12-30 18:56:41'),
(10, 49, 0.00, 0.00, 0.00, 0.00, 'INR', 'active', '2026-01-10 00:56:29', '2026-01-10 00:56:29'),
(11, 50, 0.00, 0.00, 0.00, 0.00, 'INR', 'active', '2026-01-19 13:01:31', '2026-01-19 13:01:31'),
(12, 52, 0.00, 0.00, 0.00, 0.00, 'INR', 'active', '2026-01-23 15:32:02', '2026-01-23 15:32:02'),
(13, 53, 0.00, 0.00, 0.00, 0.00, 'INR', 'active', '2026-01-24 16:37:05', '2026-01-24 16:37:05'),
(14, 54, 0.00, 0.00, 0.00, 0.00, 'INR', 'active', '2026-01-30 22:55:35', '2026-01-30 22:55:35');

-- --------------------------------------------------------

--
-- Table structure for table `wallet_transactions`
--

CREATE TABLE `wallet_transactions` (
  `id` bigint NOT NULL,
  `wallet_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `transaction_id` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `reference_type` enum('ride_payment','ride_refund','topup','withdrawal','bonus','referral_bonus','cashback','penalty','adjustment','driver_earning','driver_commission') COLLATE utf8mb4_general_ci NOT NULL,
  `reference_id` bigint DEFAULT NULL COMMENT 'Related entity ID (ride_id, promo_id, etc.)',
  `type` enum('credit','debit') COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance_before` decimal(10,2) NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `payment_method` enum('easebuzz','cash','bank_transfer','adjustment') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_gateway` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'razorpay',
  `gateway_transaction_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gateway_payment_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gateway_order_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('pending','completed','failed','cancelled','refunded') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `processed_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `failure_reason` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Additional transaction details',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `wallet_transactions`
--

INSERT INTO `wallet_transactions` (`id`, `wallet_id`, `user_id`, `transaction_id`, `reference_type`, `reference_id`, `type`, `amount`, `balance_before`, `balance_after`, `description`, `payment_method`, `payment_gateway`, `gateway_transaction_id`, `gateway_payment_id`, `gateway_order_id`, `status`, `processed_at`, `failed_at`, `failure_reason`, `metadata`, `created_at`, `updated_at`) VALUES
(1, 2, 32, 'TOPUP_e7a8d28a_7ba8_4', 'topup', NULL, 'credit', 500.00, 100.00, 100.00, 'Wallet top-up of ₹500.00', 'easebuzz', 'easebuzz', NULL, NULL, 'TOPUP_e7a8d28a_7ba8_4', 'pending', NULL, NULL, NULL, '\"{\\\"initiated_at\\\":\\\"2025-12-09T05:54:23.877Z\\\",\\\"user_agent\\\":\\\"Dart/3.9 (dart:io)\\\"}\"', '2025-12-09 11:24:23', '2025-12-09 11:24:23'),
(2, 2, 32, 'COMM_1765266013267_0UD0YQ385', 'driver_commission', 33, 'debit', 23.98, 100.00, 76.02, 'Commission deduction for completed ride #33 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-09 13:10:13', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"33\\\",\\\"final_fare\\\":159.86,\\\"commission_percentage\\\":\\\"15.00\\\",\\\"driver_payout\\\":135.88,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-09 13:10:13', '2025-12-09 13:10:13'),
(3, 2, 32, 'COMM_1765279361111_SR0CQ0921', 'driver_commission', 35, 'debit', 23.98, 76.02, 52.04, 'Commission deduction for completed ride #35 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-09 16:52:41', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"35\\\",\\\"final_fare\\\":159.88,\\\"commission_percentage\\\":\\\"15.00\\\",\\\"driver_payout\\\":135.9,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-09 16:52:41', '2025-12-09 16:52:41'),
(4, 2, 32, 'COMM_1765279545264_XLO4RH0J6', 'driver_commission', 36, 'debit', 23.98, 52.04, 28.06, 'Commission deduction for completed ride #36 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-09 16:55:45', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"36\\\",\\\"final_fare\\\":159.88,\\\"commission_percentage\\\":\\\"15.00\\\",\\\"driver_payout\\\":135.9,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-09 16:55:45', '2025-12-09 16:55:45'),
(5, 2, 32, 'COMM_1765280149544_Q23V4ERNM', 'driver_commission', 38, 'debit', 23.98, 28.06, 4.08, 'Commission deduction for completed ride #38 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-09 17:05:49', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"38\\\",\\\"final_fare\\\":159.88,\\\"commission_percentage\\\":\\\"15.00\\\",\\\"driver_payout\\\":135.9,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-09 17:05:49', '2025-12-09 17:05:49'),
(6, 2, 32, 'COMM_1765280321837_E6AU72F7H', 'driver_commission', 39, 'debit', 23.98, 4.08, -19.90, 'Commission deduction for completed ride #39 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-09 17:08:41', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"39\\\",\\\"final_fare\\\":159.87,\\\"commission_percentage\\\":\\\"15.00\\\",\\\"driver_payout\\\":135.89,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-09 17:08:41', '2025-12-09 17:08:41'),
(7, 3, 37, 'COMM_1765287019638_PUOBVIKT1', 'driver_commission', 40, 'debit', 24.11, 0.00, -24.11, 'Commission deduction for completed ride #40 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-09 19:00:19', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"40\\\",\\\"final_fare\\\":160.72,\\\"commission_percentage\\\":\\\"15.00\\\",\\\"driver_payout\\\":136.61,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-09 19:00:19', '2025-12-09 19:00:19'),
(8, 3, 37, 'COMM_1765287374556_82FK57M8H', 'driver_commission', 41, 'debit', 24.11, -24.11, -48.22, 'Commission deduction for completed ride #41 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-09 19:06:14', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"41\\\",\\\"final_fare\\\":160.72,\\\"commission_percentage\\\":\\\"15.00\\\",\\\"driver_payout\\\":136.61,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-09 19:06:14', '2025-12-09 19:06:14'),
(9, 4, 39, 'COMM_1765342999005_CVFHSJTKE', 'driver_commission', 42, 'debit', 28.70, 0.00, -28.70, 'Commission deduction for completed ride #42 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-10 10:33:19', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"42\\\",\\\"final_fare\\\":191.36,\\\"commission_percentage\\\":\\\"15.00\\\",\\\"driver_payout\\\":162.66,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-10 10:33:19', '2025-12-10 10:33:19'),
(10, 4, 39, 'COMM_1765429900642_A30P79QUE', 'driver_commission', 43, 'debit', 28.71, -28.70, -57.41, 'Commission deduction for completed ride #43 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-11 10:41:40', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"43\\\",\\\"final_fare\\\":191.37,\\\"commission_percentage\\\":\\\"15.00\\\",\\\"driver_payout\\\":162.66,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-11 10:41:40', '2025-12-11 10:41:40'),
(11, 9, 46, 'COMM_1767101201063_CQ4FFUTMS', 'driver_commission', 45, 'debit', 17.32, 0.00, -17.32, 'Commission deduction for completed ride #45 (Cash payment collected)', NULL, 'easebuzz', NULL, NULL, NULL, 'completed', '2025-12-30 18:56:41', NULL, NULL, '\"{\\\"ride_request_id\\\":\\\"45\\\",\\\"final_fare\\\":115.5,\\\"commission_value\\\":\\\"15.00\\\",\\\"commission_type\\\":\\\"percentage\\\",\\\"driver_payout\\\":98.17,\\\"payment_method\\\":\\\"cash\\\",\\\"note\\\":\\\"Commission deducted after driver collected cash from passenger\\\"}\"', '2025-12-30 18:56:41', '2025-12-30 18:56:41');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cancellation_policy`
--
ALTER TABLE `cancellation_policy`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `category_complaints`
--
ALTER TABLE `category_complaints`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_updated_by` (`updated_by`);

--
-- Indexes for table `complaints`
--
ALTER TABLE `complaints`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ticket_no` (`ticket_no`),
  ADD KEY `fk_complaints_creator` (`created_by`),
  ADD KEY `fk_complaints_updater` (`updated_by`),
  ADD KEY `idx_complaints_category` (`category_id`),
  ADD KEY `idx_complaints_subcategory` (`subcategory_id`),
  ADD KEY `idx_complaints_user` (`user_id`),
  ADD KEY `idx_complaints_status` (`status`),
  ADD KEY `idx_complaints_resolved_by` (`resolved_by`),
  ADD KEY `idx_complaints_created_at` (`created_at`),
  ADD KEY `idx_complaints_title` (`title`),
  ADD KEY `idx_complaints_search` (`title`,`description`(100)),
  ADD KEY `idx_complaints_user_type` (`user_type`),
  ADD KEY `idx_complaints_ride_id` (`ride_id`),
  ADD KEY `idx_complaints_status_color` (`status_color`),
  ADD KEY `idx_ticket_no` (`ticket_no`),
  ADD KEY `idx_owner_id` (`owner_id`);

--
-- Indexes for table `complaint_assignments`
--
ALTER TABLE `complaint_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_complaint_id` (`complaint_id`),
  ADD KEY `idx_assigned_to` (`assigned_to`),
  ADD KEY `idx_assigned_by` (`assigned_by`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_assigned_at` (`assigned_at`);

--
-- Indexes for table `driver_deposit_transactions`
--
ALTER TABLE `driver_deposit_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_transaction_id` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_2` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_3` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_4` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_5` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_6` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_7` (`transaction_id`),
  ADD KEY `idx_driver_id` (`driver_id`),
  ADD KEY `idx_ride_request_id` (`ride_request_id`),
  ADD KEY `idx_transaction_type` (`transaction_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_cancellation_date` (`cancellation_date`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `driver_details`
--
ALTER TABLE `driver_details`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_user_id` (`user_id`),
  ADD UNIQUE KEY `uk_aadhar_no` (`aadhar_no`),
  ADD UNIQUE KEY `uk_license_number` (`license_number`),
  ADD UNIQUE KEY `uk_vehicle_rc_no` (`vehicle_rc_no`),
  ADD UNIQUE KEY `aadhar_no` (`aadhar_no`),
  ADD UNIQUE KEY `license_number` (`license_number`),
  ADD UNIQUE KEY `vehicle_rc_no` (`vehicle_rc_no`),
  ADD UNIQUE KEY `aadhar_no_2` (`aadhar_no`),
  ADD UNIQUE KEY `license_number_2` (`license_number`),
  ADD UNIQUE KEY `vehicle_rc_no_2` (`vehicle_rc_no`),
  ADD UNIQUE KEY `aadhar_no_3` (`aadhar_no`),
  ADD UNIQUE KEY `license_number_3` (`license_number`),
  ADD UNIQUE KEY `vehicle_rc_no_3` (`vehicle_rc_no`),
  ADD UNIQUE KEY `aadhar_no_4` (`aadhar_no`),
  ADD UNIQUE KEY `license_number_4` (`license_number`),
  ADD UNIQUE KEY `vehicle_rc_no_4` (`vehicle_rc_no`),
  ADD UNIQUE KEY `aadhar_no_5` (`aadhar_no`),
  ADD UNIQUE KEY `license_number_5` (`license_number`),
  ADD UNIQUE KEY `vehicle_rc_no_5` (`vehicle_rc_no`),
  ADD UNIQUE KEY `aadhar_no_6` (`aadhar_no`),
  ADD UNIQUE KEY `license_number_6` (`license_number`),
  ADD UNIQUE KEY `vehicle_rc_no_6` (`vehicle_rc_no`),
  ADD UNIQUE KEY `aadhar_no_7` (`aadhar_no`),
  ADD UNIQUE KEY `license_number_7` (`license_number`),
  ADD UNIQUE KEY `vehicle_rc_no_7` (`vehicle_rc_no`),
  ADD UNIQUE KEY `uk_vehicle_number` (`vehicle_number`),
  ADD UNIQUE KEY `vehicle_number` (`vehicle_number`),
  ADD UNIQUE KEY `rating` (`rating`),
  ADD UNIQUE KEY `vehicle_number_2` (`vehicle_number`),
  ADD UNIQUE KEY `rating_2` (`rating`),
  ADD UNIQUE KEY `vehicle_number_3` (`vehicle_number`),
  ADD UNIQUE KEY `rating_3` (`rating`),
  ADD UNIQUE KEY `vehicle_number_4` (`vehicle_number`),
  ADD UNIQUE KEY `rating_4` (`rating`),
  ADD UNIQUE KEY `vehicle_number_5` (`vehicle_number`),
  ADD UNIQUE KEY `rating_5` (`rating`),
  ADD UNIQUE KEY `vehicle_number_6` (`vehicle_number`),
  ADD UNIQUE KEY `rating_6` (`rating`),
  ADD UNIQUE KEY `vehicle_number_7` (`vehicle_number`),
  ADD UNIQUE KEY `rating_7` (`rating`),
  ADD KEY `idx_vehicle_id` (`vehicle_id`),
  ADD KEY `idx_vehicle_type_id` (`vehicle_type_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_deposit_status` (`deposit_status`),
  ADD KEY `idx_deposit_balance` (`deposit_balance`);

--
-- Indexes for table `driver_locations`
--
ALTER TABLE `driver_locations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_driver_id` (`driver_id`),
  ADD UNIQUE KEY `unique_driver_id` (`driver_id`),
  ADD KEY `idx_is_online` (`is_online`),
  ADD KEY `idx_location` (`latitude`,`longitude`),
  ADD KEY `idx_last_updated` (`last_updated_at`),
  ADD KEY `idx_online_updated` (`is_online`,`last_updated_at`),
  ADD KEY `idx_online_location` (`is_online`,`latitude`,`longitude`),
  ADD KEY `idx_last_online` (`last_online_at`),
  ADD KEY `idx_last_offline` (`last_offline_at`);

--
-- Indexes for table `driver_subscriptions`
--
ALTER TABLE `driver_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_transaction_id` (`transaction_id`),
  ADD UNIQUE KEY `uk_subscription_number` (`subscription_number`),
  ADD KEY `idx_driver_id` (`driver_id`),
  ADD KEY `idx_plan_id` (`plan_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_start_end_date` (`start_date`,`end_date`),
  ADD KEY `idx_active_subscriptions` (`driver_id`,`status`,`end_date`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `licenses`
--
ALTER TABLE `licenses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `license_id` (`license_id`),
  ADD UNIQUE KEY `unique_license_id` (`license_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_plan` (`plan`),
  ADD KEY `idx_domain` (`domain`),
  ADD KEY `idx_expiry_on` (`expiry_on`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_read_status` (`read_status`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_user_unread` (`user_id`,`read_status`),
  ADD KEY `idx_user_created` (`user_id`,`created_at`);

--
-- Indexes for table `otp`
--
ALTER TABLE `otp`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mobile` (`mobile`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `packages`
--
ALTER TABLE `packages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_name` (`name`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `packages_name` (`name`),
  ADD KEY `packages_status` (`status`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_role_id` (`role_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_module` (`module`);

--
-- Indexes for table `promo_codes`
--
ALTER TABLE `promo_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_code` (`code`),
  ADD UNIQUE KEY `code` (`code`),
  ADD UNIQUE KEY `code_2` (`code`),
  ADD UNIQUE KEY `code_3` (`code`),
  ADD UNIQUE KEY `code_4` (`code`),
  ADD UNIQUE KEY `code_5` (`code`),
  ADD UNIQUE KEY `code_6` (`code`),
  ADD UNIQUE KEY `code_7` (`code`),
  ADD KEY `idx_coupon_type_status` (`coupon_type`,`status`,`expires_at`),
  ADD KEY `idx_validity` (`starts_at`,`expires_at`);

--
-- Indexes for table `promo_usages`
--
ALTER TABLE `promo_usages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_promo_id` (`promo_id`),
  ADD KEY `idx_ride_id` (`ride_id`);

--
-- Indexes for table `referrals`
--
ALTER TABLE `referrals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_referred_id` (`referred_id`),
  ADD KEY `idx_referrer_id` (`referrer_id`),
  ADD KEY `idx_referral_code` (`referral_code`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_token` (`token`),
  ADD UNIQUE KEY `token` (`token`),
  ADD UNIQUE KEY `token_2` (`token`),
  ADD UNIQUE KEY `token_3` (`token`),
  ADD UNIQUE KEY `token_4` (`token`),
  ADD UNIQUE KEY `token_5` (`token`),
  ADD UNIQUE KEY `token_6` (`token`),
  ADD UNIQUE KEY `token_7` (`token`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `reservation_advance_payments`
--
ALTER TABLE `reservation_advance_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_transaction_id` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_2` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_3` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_4` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_5` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_6` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_7` (`transaction_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_package_id` (`package_id`),
  ADD KEY `idx_vehicle_type_id` (`vehicle_type_id`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_ride_request_id` (`ride_request_id`),
  ADD KEY `idx_pickup_date` (`pickup_date`),
  ADD KEY `idx_is_custom_trip` (`is_custom_trip`);

--
-- Indexes for table `ride_payment_orders`
--
ALTER TABLE `ride_payment_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_order_id` (`order_id`),
  ADD UNIQUE KEY `idx_transaction_id` (`transaction_id`),
  ADD KEY `idx_ride_request_id` (`ride_request_id`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_gateway_transaction_id` (`gateway_transaction_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `ride_requests`
--
ALTER TABLE `ride_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `share_token` (`share_token`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_driver_id` (`driver_id`),
  ADD KEY `idx_trip_id` (`trip_id`),
  ADD KEY `idx_vehicle_type_id` (`vehicle_type_id`),
  ADD KEY `idx_package_id` (`package_id`),
  ADD KEY `idx_coupon_id` (`coupon_id`),
  ADD KEY `idx_advance_payment_id` (`advance_payment_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_pickup_state_id` (`pickup_state_id`),
  ADD KEY `idx_dropoff_state_id` (`dropoff_state_id`),
  ADD KEY `idx_stop1_state_id` (`stop1_state_id`),
  ADD KEY `idx_stop2_state_id` (`stop2_state_id`),
  ADD KEY `idx_pickup_date` (`pickup_date`),
  ADD KEY `idx_requested_at` (`requested_at`),
  ADD KEY `idx_pickup_location` (`pickup_latitude`,`pickup_longitude`),
  ADD KEY `idx_meter_readings` (`trip_type`,`start_meter_reading`,`end_meter_reading`),
  ADD KEY `idx_is_custom_trip` (`is_custom_trip`),
  ADD KEY `idx_custom_trip_details` (`is_custom_trip`,`custom_km`,`custom_days`),
  ADD KEY `idx_dropoff_location` (`dropoff_latitude`,`dropoff_longitude`),
  ADD KEY `idx_status_created` (`status`,`created_at`),
  ADD KEY `idx_trip_type` (`trip_type`),
  ADD KEY `idx_fare_range` (`final_fare`),
  ADD KEY `idx_distance_range` (`estimated_distance`,`actual_distance`),
  ADD KEY `idx_pickup_schedule` (`pickup_date`,`pickup_time`),
  ADD KEY `idx_trip_type_date` (`trip_type`,`pickup_date`),
  ADD KEY `idx_pending_cancellation` (`pending_cancellation_applied`,`pending_cancellation_amount`),
  ADD KEY `idx_search_restart` (`search_restart_count`,`status`),
  ADD KEY `idx_is_advance_paid` (`is_advance_paid`),
  ADD KEY `idx_transferred_rides` (`is_transferred_to_admin`,`transferred_at`),
  ADD KEY `idx_transferred_by_driver` (`transferred_by_driver_id`),
  ADD KEY `idx_share_token` (`share_token`),
  ADD KEY `idx_commission_type` (`commission_type`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_name` (`name`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `name_2` (`name`),
  ADD UNIQUE KEY `name_3` (`name`),
  ADD UNIQUE KEY `name_4` (`name`),
  ADD UNIQUE KEY `name_5` (`name`),
  ADD UNIQUE KEY `name_6` (`name`),
  ADD UNIQUE KEY `name_7` (`name`);

--
-- Indexes for table `saved_address`
--
ALTER TABLE `saved_address`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_name` (`name`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `name_2` (`name`),
  ADD UNIQUE KEY `name_3` (`name`),
  ADD UNIQUE KEY `name_4` (`name`),
  ADD UNIQUE KEY `name_5` (`name`),
  ADD UNIQUE KEY `name_6` (`name`),
  ADD UNIQUE KEY `name_7` (`name`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_role` (`role`),
  ADD UNIQUE KEY `role` (`role`),
  ADD UNIQUE KEY `role_2` (`role`),
  ADD UNIQUE KEY `role_3` (`role`),
  ADD UNIQUE KEY `role_4` (`role`),
  ADD UNIQUE KEY `role_5` (`role`),
  ADD UNIQUE KEY `role_6` (`role`),
  ADD UNIQUE KEY `role_7` (`role`);

--
-- Indexes for table `sos`
--
ALTER TABLE `sos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_alert_id` (`alert_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_ride_request_id` (`ride_request_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `states`
--
ALTER TABLE `states`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_state_name` (`state_name`),
  ADD UNIQUE KEY `uk_state_code` (`state_code`),
  ADD UNIQUE KEY `state_name` (`state_name`),
  ADD UNIQUE KEY `state_code` (`state_code`),
  ADD UNIQUE KEY `state_name_2` (`state_name`),
  ADD UNIQUE KEY `state_code_2` (`state_code`),
  ADD UNIQUE KEY `state_name_3` (`state_name`),
  ADD UNIQUE KEY `state_code_3` (`state_code`),
  ADD UNIQUE KEY `state_name_4` (`state_name`),
  ADD UNIQUE KEY `state_code_4` (`state_code`),
  ADD UNIQUE KEY `state_name_5` (`state_name`),
  ADD UNIQUE KEY `state_code_5` (`state_code`),
  ADD UNIQUE KEY `state_name_6` (`state_name`),
  ADD UNIQUE KEY `state_code_6` (`state_code`),
  ADD UNIQUE KEY `state_name_7` (`state_name`),
  ADD UNIQUE KEY `state_code_7` (`state_code`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_region` (`region`);

--
-- Indexes for table `subcategory_complaints`
--
ALTER TABLE `subcategory_complaints`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_updated_by` (`updated_by`);

--
-- Indexes for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_duration_type` (`duration_type`),
  ADD KEY `idx_sort_order` (`sort_order`);

--
-- Indexes for table `subscription_usage_history`
--
ALTER TABLE `subscription_usage_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscription_id` (`subscription_id`),
  ADD KEY `idx_ride_request_id` (`ride_request_id`),
  ADD KEY `idx_used_at` (`used_at`);

--
-- Indexes for table `trips`
--
ALTER TABLE `trips`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_trip` (`trip`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_email` (`email`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `email_2` (`email`),
  ADD UNIQUE KEY `email_3` (`email`),
  ADD UNIQUE KEY `email_4` (`email`),
  ADD UNIQUE KEY `email_5` (`email`),
  ADD UNIQUE KEY `email_6` (`email`),
  ADD UNIQUE KEY `email_7` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_pending_charge` (`pending_cancellation_charge`);

--
-- Indexes for table `user_coupons`
--
ALTER TABLE `user_coupons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_promo_id` (`promo_id`),
  ADD KEY `idx_is_used` (`is_used`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_user_role` (`user_id`,`role_id`),
  ADD UNIQUE KEY `user_roles_user_id_role_id` (`user_id`,`role_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_role_id` (`role_id`),
  ADD KEY `idx_is_primary` (`is_primary`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `vehicle_prices`
--
ALTER TABLE `vehicle_prices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_vehicle_trip_state` (`vehicle_type_id`,`trip_id`,`state_id`),
  ADD UNIQUE KEY `uk_vehicle_trip_state_package` (`vehicle_type_id`,`trip_id`,`state_id`,`package_id`),
  ADD KEY `idx_vehicle_id` (`vehicle_id`),
  ADD KEY `idx_vehicle_type_id` (`vehicle_type_id`),
  ADD KEY `idx_trip_id` (`trip_id`),
  ADD KEY `idx_state_id` (`state_id`),
  ADD KEY `idx_package_id` (`package_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_status_pricing` (`status`,`updated_pricing_at`);

--
-- Indexes for table `vehicle_types`
--
ALTER TABLE `vehicle_types`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vehicle_id` (`vehicle_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `wallets`
--
ALTER TABLE `wallets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_user_id` (`user_id`),
  ADD KEY `idx_balance` (`balance`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_wallet_user_status` (`user_id`,`status`);

--
-- Indexes for table `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_transaction_id` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_2` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_3` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_4` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_5` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_6` (`transaction_id`),
  ADD UNIQUE KEY `transaction_id_7` (`transaction_id`),
  ADD KEY `idx_wallet_id` (`wallet_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_reference` (`reference_type`,`reference_id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_type_status` (`type`,`status`),
  ADD KEY `idx_gateway_payment_id` (`gateway_payment_id`),
  ADD KEY `idx_gateway_order_id` (`gateway_order_id`),
  ADD KEY `idx_status_processed` (`status`,`processed_at`),
  ADD KEY `idx_transaction_date_type` (`created_at`,`type`),
  ADD KEY `idx_transaction_gateway` (`payment_gateway`,`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cancellation_policy`
--
ALTER TABLE `cancellation_policy`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `category_complaints`
--
ALTER TABLE `category_complaints`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `complaints`
--
ALTER TABLE `complaints`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `complaint_assignments`
--
ALTER TABLE `complaint_assignments`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `driver_deposit_transactions`
--
ALTER TABLE `driver_deposit_transactions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `driver_details`
--
ALTER TABLE `driver_details`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `driver_locations`
--
ALTER TABLE `driver_locations`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;

--
-- AUTO_INCREMENT for table `driver_subscriptions`
--
ALTER TABLE `driver_subscriptions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `feedback`
--
ALTER TABLE `feedback`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `licenses`
--
ALTER TABLE `licenses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `otp`
--
ALTER TABLE `otp`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `packages`
--
ALTER TABLE `packages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=107;

--
-- AUTO_INCREMENT for table `promo_codes`
--
ALTER TABLE `promo_codes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `promo_usages`
--
ALTER TABLE `promo_usages`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `referrals`
--
ALTER TABLE `referrals`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=212;

--
-- AUTO_INCREMENT for table `reservation_advance_payments`
--
ALTER TABLE `reservation_advance_payments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ride_payment_orders`
--
ALTER TABLE `ride_payment_orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ride_requests`
--
ALTER TABLE `ride_requests`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `saved_address`
--
ALTER TABLE `saved_address`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `sos`
--
ALTER TABLE `sos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `states`
--
ALTER TABLE `states`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `subcategory_complaints`
--
ALTER TABLE `subcategory_complaints`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `subscription_usage_history`
--
ALTER TABLE `subscription_usage_history`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trips`
--
ALTER TABLE `trips`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `user_coupons`
--
ALTER TABLE `user_coupons`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `vehicle_prices`
--
ALTER TABLE `vehicle_prices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `vehicle_types`
--
ALTER TABLE `vehicle_types`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `wallets`
--
ALTER TABLE `wallets`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `category_complaints`
--
ALTER TABLE `category_complaints`
  ADD CONSTRAINT `fk_category_complaints_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_category_complaints_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `complaints`
--
ALTER TABLE `complaints`
  ADD CONSTRAINT `complaints_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_complaints_category` FOREIGN KEY (`category_id`) REFERENCES `category_complaints` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaints_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaints_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaints_ride` FOREIGN KEY (`ride_id`) REFERENCES `ride_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaints_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategory_complaints` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaints_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaints_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `complaint_assignments`
--
ALTER TABLE `complaint_assignments`
  ADD CONSTRAINT `complaint_assignments_ibfk_1` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `complaint_assignments_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `complaint_assignments_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `driver_deposit_transactions`
--
ALTER TABLE `driver_deposit_transactions`
  ADD CONSTRAINT `driver_deposit_transactions_ibfk_13` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `driver_deposit_transactions_ibfk_14` FOREIGN KEY (`ride_request_id`) REFERENCES `ride_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `driver_details`
--
ALTER TABLE `driver_details`
  ADD CONSTRAINT `driver_details_ibfk_19` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `driver_details_ibfk_20` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `driver_details_ibfk_21` FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `driver_locations`
--
ALTER TABLE `driver_locations`
  ADD CONSTRAINT `driver_locations_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `driver_subscriptions`
--
ALTER TABLE `driver_subscriptions`
  ADD CONSTRAINT `fk_driver_subscriptions_driver` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_driver_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `permissions`
--
ALTER TABLE `permissions`
  ADD CONSTRAINT `permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `promo_usages`
--
ALTER TABLE `promo_usages`
  ADD CONSTRAINT `promo_usages_ibfk_19` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `promo_usages_ibfk_20` FOREIGN KEY (`promo_id`) REFERENCES `promo_codes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `promo_usages_ibfk_21` FOREIGN KEY (`ride_id`) REFERENCES `ride_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `referrals`
--
ALTER TABLE `referrals`
  ADD CONSTRAINT `fk_referrals_referred` FOREIGN KEY (`referred_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_referrals_referrer` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ride_payment_orders`
--
ALTER TABLE `ride_payment_orders`
  ADD CONSTRAINT `fk_ride_payment_orders_ride_request` FOREIGN KEY (`ride_request_id`) REFERENCES `ride_requests` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subscription_usage_history`
--
ALTER TABLE `subscription_usage_history`
  ADD CONSTRAINT `fk_usage_ride` FOREIGN KEY (`ride_request_id`) REFERENCES `ride_requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_usage_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `driver_subscriptions` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
