
using {db} from '../db/schema.cds';


@path: '/service/RHSnorkelQCTrackerService'
service RHSnorkelQCTrackerService {
    entity QC_HEADER   as projection on db.QC_HEADER;
    entity QC_ITEM     as projection on db.QC_ITEM;
    entity ATTACHMENTS as projection on db.QC_ATTACHMENTS;
    entity Test_Table  as projection on db.QC_Test_Table;

    action generateQCReport(SNORKEL_NO : String) returns {
        filename : String;
        mimeType : String;
        content  : LargeBinary;
    };
}
