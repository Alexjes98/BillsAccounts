from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.context import get_current_user
from app.models.models import Person, User
from app.schemas.person import PersonOut, PersonCreate

router = APIRouter()


@router.get("", response_model=List[PersonOut])
def get_persons(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    query = db.query(Person)
    if current_user.person_id:
        query = query.filter(Person.id != current_user.person_id)

    persons = query.all()
    return persons


@router.post("", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(
    person_in: PersonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check for duplicates if needed (UniqueConstraint('user_id', 'name'))
    existing = (
        db.query(Person).filter_by(user_id=current_user.id, name=person_in.name).first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Person with this name already exists."
        )

    new_person = Person(
        user_id=current_user.id,
        name=person_in.name,
        contact_info=person_in.contact_info,
    )
    db.add(new_person)
    db.commit()
    db.refresh(new_person)
    return new_person


@router.put("/{person_id}", response_model=PersonOut)
def update_person(
    person_id: UUID,
    person_in: PersonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = (
        db.query(Person).filter_by(id=str(person_id), user_id=current_user.id).first()
    )
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Check for name uniqueness if name is changed
    if person.name != person_in.name:
        existing = (
            db.query(Person)
            .filter_by(user_id=current_user.id, name=person_in.name)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400, detail="Person with this name already exists."
            )

    person.name = person_in.name
    person.contact_info = person_in.contact_info

    db.commit()
    db.refresh(person)
    return person


@router.delete("/{person_id}")
def delete_person(
    person_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = (
        db.query(Person).filter_by(id=str(person_id), user_id=current_user.id).first()
    )
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Check if trying to delete self
    if current_user.person_id and str(person.id) == str(current_user.person_id):
        raise HTTPException(
            status_code=400, detail="Cannot delete your own person entity."
        )

    # Check for existing debts
    if person.debts_as_creditor or person.debts_as_debtor:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete person associated with existing debts.",
        )

    db.delete(person)
    db.commit()
    return {"message": "Person deleted successfully"}
