-- ObraControl schema migration 001
-- Selects the existing database only; this file does not drop or modify existing rows.
-- Apply only after reviewing and approving this migration.
USE `obracontrol`;

CREATE TABLE `usuarios` (
  `id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `email` VARCHAR(254) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuarios_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `obras` (
  `usuario_id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `client` VARCHAR(80) NULL,
  `location` VARCHAR(120) NULL,
  `status` VARCHAR(20) NOT NULL,
  `contract_value` DECIMAL(15,2) NOT NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `notes` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`usuario_id`, `id`),
  KEY `ix_obras_usuario_status` (`usuario_id`, `status`),
  CONSTRAINT `fk_obras_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `chk_obras_status`
    CHECK (`status` IN ('planejada', 'em-andamento', 'pausada', 'concluida')),
  CONSTRAINT `chk_obras_contract_value`
    CHECK (`contract_value` > 0),
  CONSTRAINT `chk_obras_dates`
    CHECK (`end_date` IS NULL OR `start_date` IS NULL OR `end_date` >= `start_date`)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `despesas` (
  `usuario_id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `obra_id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `category` VARCHAR(40) NOT NULL,
  `description` VARCHAR(120) NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `date` DATE NULL,
  `source` VARCHAR(40) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`usuario_id`, `id`),
  KEY `ix_despesas_usuario_obra` (`usuario_id`, `obra_id`),
  KEY `ix_despesas_usuario_data` (`usuario_id`, `date`),
  CONSTRAINT `fk_despesas_obra_usuario`
    FOREIGN KEY (`usuario_id`, `obra_id`)
    REFERENCES `obras` (`usuario_id`, `id`)
    ON DELETE CASCADE,
  CONSTRAINT `chk_despesas_category`
    CHECK (`category` IN (
      'funcionarios', 'combustivel', 'ferramentas', 'materiais',
      'transporte', 'aluguel-equipamentos', 'servicos', 'alimentacao',
      'taxas', 'gastos-gerais', 'gastos-anteriores'
    )),
  CONSTRAINT `chk_despesas_amount`
    CHECK (`amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `recebimentos` (
  `usuario_id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `obra_id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `date` DATE NULL,
  `description` VARCHAR(120) NULL,
  `source` VARCHAR(40) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`usuario_id`, `id`),
  KEY `ix_recebimentos_usuario_obra` (`usuario_id`, `obra_id`),
  KEY `ix_recebimentos_usuario_data` (`usuario_id`, `date`),
  CONSTRAINT `fk_recebimentos_obra_usuario`
    FOREIGN KEY (`usuario_id`, `obra_id`)
    REFERENCES `obras` (`usuario_id`, `id`)
    ON DELETE CASCADE,
  CONSTRAINT `chk_recebimentos_amount`
    CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
