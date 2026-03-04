-- AlterTable
ALTER TABLE `Task` MODIFY `title` VARCHAR(200) NOT NULL,
    MODIFY `description` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `email` VARCHAR(255) NOT NULL;
