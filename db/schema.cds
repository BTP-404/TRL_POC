using {
    managed,
    cuid
} from '@sap/cds/common';

namespace db;


entity QC_ATTACHMENTS : cuid, managed {
    sheetNo   : String(10);
    sectionNo : String(10);
    question  : String(255);
    mimeType  : String(100);
    name      : String(255);
    file      : LargeString;
    size      : Integer;
    qC_HEADER : Association to one QC_HEADER;
    qC_ITEM   : Association to one QC_ITEM;
}


entity QC_HEADER {
    key SNORKEL_NO       : String(100);
        SHEET_NO         : String(10);
        DATE_ENDED       : DateTime;
        DATE_STARTED     : DateTime;
        DRAFT_FLAG       : Boolean @default: true;
        SECTIONCOMPLETED : String(50);
        TYPE             : String;
        CUSTOMER_NAME        : String(50);
        PRODUCTION_NO: String(25);
        qc_ATTACHMENTS   : Composition of many QC_ATTACHMENTS
                               on qc_ATTACHMENTS.qC_HEADER = $self;
        qc_ITEMS         : Composition of many QC_ITEM
                               on qc_ITEMS.qC_HEADER = $self;
        qc_TESTS         : Composition of many QC_Test_Table
                               on qc_TESTS.qC_HEADER = $self;
}

entity QC_ITEM : cuid {
    ACTUAL_VALUE          : String(100);
    COMMENTS              : String(100);
    CORRECTIVE_ACTION     : String(100);
    DATE_INSPECTED        : DateTime;
    DECISION_TAKEN        : String(10);
    HEADER_ID             : UUID;
    INSPECTED_BY          : String(100);
    METHOD                : String(100);
    POSITION              : String(100);
    QUESTION              : String(200);
    SECTION_NO            : String(100);
    SUBSTEP               : String(100);
    TOLERANCE             : String(100);
    VISIBLE               : Boolean;
    WORK_ITEM_DESCRIPTION : String(100);
    WorkProcessStep       : String(100);
    aTTACHMENTS           : Composition of many QC_ATTACHMENTS
                                on aTTACHMENTS.qC_ITEM = $self;
    qC_HEADER             : Association to one QC_HEADER;
    qc_TESTS              : Composition of many QC_Test_Table
                                on qc_TESTS.qC_ITEM = $self;
}

entity QC_Test_Table : cuid, managed {
    sheetNo        : String(10);
    actualvalue    : String(100);
    date           : DateTime;
    ff             : String(100);
    fluidity       : String(100);
    method         : String(100);
    no             : String(100);
    position       : String(100);
    powderweight   : String(100);
    remark         : String(100);
    settleduration : String(100);
    spec           : String(100);
    specification  : String(100);
    testNo         : String(100);
    testname       : String(100);
    tf             : String(100);
    tolerance      : String(100);
    vibration      : String(100);
    watercasting   : String(100);
    qC_HEADER      : Association to one QC_HEADER;
    qC_ITEM        : Association to one QC_ITEM;
}
