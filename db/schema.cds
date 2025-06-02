namespace RHSnorkelQCTracker;

entity QC_HEADER
{
    key ID : UUID;
    SNORKEL_NO : String(100) not null;
    DATE_STARTED : Date;
    DATE_ENDED : Date;
    qC_ITEMS : Composition of many QC_ITEM on qC_ITEMS.qC_HEADER = $self;
}

entity QC_ITEM
{
    key ID : UUID;
    HEADER_ID : UUID;
    SECTION_NO : String(100);
    WORK_ITEM_DESCRIPTION : String(100);
    DATE_INSPECTED : Date;
    INSPECTED_BY : String(100);
    METHOD : String(100);
    DECISION_TAKEN : Boolean;
    TOLERANCE : String(100);
    ACTUAL_VALUE : String(100);
    POSITION : String(100);
    COMMENTS : String(100);
    CORRECTIVE_ACTION : String(100);
    qC_HEADER : Association to one QC_HEADER;
    aTTACHMENTS : Composition of many ATTACHMENTS on aTTACHMENTS.qC_ITEM = $self;
    WorkProcessStep : String(100);
    SubStep : String(100);
}

entity ATTACHMENTS
{
    key ID : UUID;
    ITEM_ID : String(100);
    FILE_URL : String(100);
    DESCRIPTION : String(100);
    newProperty : String(100);
    qC_ITEM : Association to one QC_ITEM;
}
