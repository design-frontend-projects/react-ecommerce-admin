-- AlterTable price_list: add store_id foreign key and index
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'price_list_store_id_fkey'
    ) THEN
        ALTER TABLE " public\.\price_list\
 ADD CONSTRAINT \price_list_store_id_fkey\
 FOREIGN KEY (\store_id\) REFERENCES \public\.\stores\(\store_id\)
 ON DELETE SET NULL ON UPDATE NO ACTION;
 END IF;
END \$\$;

CREATE INDEX IF NOT EXISTS \idx_price_list_store_id\ ON \public\.\price_list\(\store_id\);
