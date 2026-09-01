"""
SWARAKSHA — Universal Database Manager (PostgreSQL & SQLite Fallback)

Supports:
- PostgreSQL primary connection via SQLAlchemy with automatic table migrations
- Automatic fallback to SQLite if PostgreSQL is offline or unconfigured
- User authentication & password storage
- System Audit Logging
- Scan & Video analysis report archiving
- Protected persons & embedding registry
"""

import os
import sys
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean, DateTime, Text, ForeignKey,
    inspect, select, desc, text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, scoped_session
from sqlalchemy.exc import OperationalError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config

Base = declarative_base()


# ── Database Models ─────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    scan_reports = relationship("ScanReport", back_populates="user", cascade="all, delete-orphan")
    persons = relationship("Person", back_populates="user")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    ip_address = Column(String(45), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


class ScanReport(Base):
    __tablename__ = "scan_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True, index=True)
    report_type = Column(String(50), nullable=False)  # "FACE_SCAN", "VIDEO_SCAN"
    action_verdict = Column(String(50), nullable=False)  # "ALLOW", "BLOCK", "POTENTIAL_AI_MANIPULATION", etc.
    summary = Column(Text, nullable=False)
    details_json = Column(Text, nullable=True)  # JSON serialized metadata, frame timeline, and scores
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="scan_reports")


class Person(Base):
    __tablename__ = "persons"

    person_id = Column(String(255), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    image_count = Column(Integer, default=0)

    user = relationship("User", back_populates="persons")
    embedding_records = relationship("EmbeddingRecord", back_populates="person", cascade="all, delete-orphan")


class EmbeddingRecord(Base):
    __tablename__ = "embedding_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(String(255), ForeignKey("persons.person_id", ondelete="CASCADE"), nullable=False, index=True)
    faiss_idx = Column(Integer, nullable=False, index=True)
    image_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    person = relationship("Person", back_populates="embedding_records")


# ── Database Manager ────────────────────────────────────────────────────────

class DatabaseManager:
    """
    Unified manager handling PostgreSQL connections with automatic fallback to SQLite.
    """

    def __init__(self, database_url: Optional[str] = None):
        self.db_url = database_url or config.DATABASE_URL
        self.is_postgres = False
        self.engine = None
        self.SessionFactory = None

        self._init_connection()

    def _init_connection(self):
        """Initializes database engine and creates tables."""
        # Try PostgreSQL first if URL is postgresql://
        if self.db_url.startswith("postgresql://") or self.db_url.startswith("postgres://"):
            try:
                print("[DATABASE] Attempting connection to PostgreSQL...")
                self.engine = create_engine(self.db_url, pool_pre_ping=True, pool_size=10, max_overflow=20)
                # Test connection
                with self.engine.connect() as conn:
                    pass
                self.is_postgres = True
                print("[DATABASE] [OK] Connected to PostgreSQL database successfully.")
            except Exception as e:
                print(f"[DATABASE] [NOTICE] PostgreSQL not reachable ({e}). Falling back to SQLite.")
                self._fallback_sqlite()
        else:
            self._fallback_sqlite()

        self.SessionFactory = scoped_session(sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=self.engine))
        Base.metadata.create_all(bind=self.engine)
        self._ensure_schema_compatibility()

    def _ensure_schema_compatibility(self):
        """Ensures existing tables have all modern columns like user_id."""
        try:
            with self.engine.begin() as conn:
                try:
                    conn.execute(text("ALTER TABLE persons ADD COLUMN user_id INTEGER"))
                except Exception:
                    pass
        except Exception:
            pass

    def _fallback_sqlite(self):
        """Fallback to local SQLite database."""
        sqlite_path = config.DB_PATH
        os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
        sqlite_url = f"sqlite:///{sqlite_path}"
        self.engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        self.is_postgres = False
        print(f"[DATABASE] [OK] Connected to SQLite database: {sqlite_path}")

    def get_session(self):
        """Provides a database session."""
        return self.SessionFactory()

    # ── User & Auth Operations ──────────────────────────────────────────────

    def create_user(self, email: str, password_hash: str, full_name: Optional[str] = None) -> Dict[str, Any]:
        """Creates a new registered user."""
        email_clean = email.strip().lower()
        session = self.get_session()
        try:
            existing = session.query(User).filter(User.email == email_clean).first()
            if existing:
                raise ValueError(f"User with email '{email_clean}' already exists.")

            user = User(
                email=email_clean,
                password_hash=password_hash,
                full_name=full_name.strip() if full_name else None,
                is_active=True
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            self.log_audit(user.id, "USER_REGISTERED", details=f"User registered with email {email_clean}")
            return {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieves user by email address."""
        email_clean = email.strip().lower()
        session = self.get_session()
        try:
            user = session.query(User).filter(User.email == email_clean).first()
            if not user:
                return None
            return {
                "id": user.id,
                "email": user.email,
                "password_hash": user.password_hash,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
            }
        finally:
            session.close()

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves user by user ID."""
        session = self.get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            return {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
            }
        finally:
            session.close()

    def update_user_last_login(self, user_id: int):
        """Updates user's last login timestamp."""
        session = self.get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if user:
                user.last_login = datetime.utcnow()
                session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    # ── Audit Logging ───────────────────────────────────────────────────────

    def log_audit(self, user_id: Optional[int], action: str, ip_address: Optional[str] = None, details: Optional[str] = None):
        """Logs an action into the audit_logs table."""
        session = self.get_session()
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                ip_address=ip_address,
                details=details
            )
            session.add(log_entry)
            session.commit()
        except Exception as e:
            print(f"[AUDIT] Error writing audit log: {e}")
            session.rollback()
        finally:
            session.close()

    def get_audit_logs(self, user_id: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent audit logs."""
        session = self.get_session()
        try:
            query = session.query(AuditLog)
            if user_id:
                query = query.filter(AuditLog.user_id == user_id)
            logs = query.order_by(desc(AuditLog.timestamp)).limit(limit).all()
            return [
                {
                    "id": l.id,
                    "user_id": l.user_id,
                    "action": l.action,
                    "ip_address": l.ip_address,
                    "details": l.details,
                    "timestamp": l.timestamp.isoformat() if l.timestamp else None,
                }
                for l in logs
            ]
        finally:
            session.close()

    # ── Scan Reports ────────────────────────────────────────────────────────

    def create_scan_report(
        self,
        report_type: str,
        action_verdict: str,
        summary: str,
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        email_sent: bool = False
    ) -> Dict[str, Any]:
        """Saves a face or video scan report to the database."""
        session = self.get_session()
        try:
            details_str = json.dumps(details, default=str) if details else None
            report = ScanReport(
                user_id=user_id,
                user_email=user_email,
                report_type=report_type,
                action_verdict=action_verdict,
                summary=summary,
                details_json=details_str,
                email_sent=email_sent,
                email_sent_at=datetime.utcnow() if email_sent else None,
            )
            session.add(report)
            session.commit()
            session.refresh(report)

            self.log_audit(
                user_id=user_id,
                action=f"{report_type}_REPORT_CREATED",
                details=f"Verdict: {action_verdict} - {summary[:100]}"
            )

            return {
                "id": report.id,
                "user_id": report.user_id,
                "user_email": report.user_email,
                "report_type": report.report_type,
                "action_verdict": report.action_verdict,
                "summary": report.summary,
                "details": details or {},
                "email_sent": report.email_sent,
                "created_at": report.created_at.isoformat() if report.created_at else None,
            }
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_user_reports(self, user_id: Optional[int] = None, user_email: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves scan report history for a user."""
        session = self.get_session()
        try:
            query = session.query(ScanReport)
            if user_id:
                query = query.filter(ScanReport.user_id == user_id)
            elif user_email:
                query = query.filter(ScanReport.user_email == user_email.strip().lower())

            reports = query.order_by(desc(ScanReport.created_at)).limit(limit).all()
            result = []
            for r in reports:
                details = {}
                if r.details_json:
                    try:
                        details = json.loads(r.details_json)
                    except Exception:
                        pass
                result.append({
                    "id": r.id,
                    "user_id": r.user_id,
                    "user_email": r.user_email,
                    "report_type": r.report_type,
                    "action_verdict": r.action_verdict,
                    "summary": r.summary,
                    "details": details,
                    "email_sent": r.email_sent,
                    "email_sent_at": r.email_sent_at.isoformat() if r.email_sent_at else None,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                })
            return result
        finally:
            session.close()

    def get_report_by_id(self, report_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single scan report by ID."""
        session = self.get_session()
        try:
            r = session.query(ScanReport).filter(ScanReport.id == report_id).first()
            if not r:
                return None
            details = {}
            if r.details_json:
                try:
                    details = json.loads(r.details_json)
                except Exception:
                    pass
            return {
                "id": r.id,
                "user_id": r.user_id,
                "user_email": r.user_email,
                "report_type": r.report_type,
                "action_verdict": r.action_verdict,
                "summary": r.summary,
                "details": details,
                "email_sent": r.email_sent,
                "email_sent_at": r.email_sent_at.isoformat() if r.email_sent_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
        finally:
            session.close()

    def mark_report_email_sent(self, report_id: int):
        """Marks a scan report as emailed."""
        session = self.get_session()
        try:
            report = session.query(ScanReport).filter(ScanReport.id == report_id).first()
            if report:
                report.email_sent = True
                report.email_sent_at = datetime.utcnow()
                session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    # ── Persons & Embedding Registry ────────────────────────────────────────

    def add_person(self, person_id: str, name: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Adds a new protected person."""
        session = self.get_session()
        try:
            existing = session.query(Person).filter(Person.person_id == person_id).first()
            if existing:
                raise ValueError(f"Person with ID '{person_id}' already exists.")

            person = Person(
                person_id=person_id,
                name=name,
                user_id=user_id,
                image_count=0
            )
            session.add(person)
            session.commit()
            session.refresh(person)

            self.log_audit(user_id, "PERSON_REGISTERED", details=f"Registered protected identity {name} ({person_id})")

            return {
                "person_id": person.person_id,
                "name": person.name,
                "created_at": person.created_at.isoformat() if person.created_at else None,
                "image_count": person.image_count,
            }
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def add_embedding_record(self, person_id: str, faiss_idx: int, image_name: Optional[str] = None) -> int:
        """Adds an embedding record and increments person's image count."""
        session = self.get_session()
        try:
            record = EmbeddingRecord(
                person_id=person_id,
                faiss_idx=faiss_idx,
                image_name=image_name
            )
            session.add(record)

            person = session.query(Person).filter(Person.person_id == person_id).first()
            if person:
                person.image_count = (person.image_count or 0) + 1

            session.commit()
            session.refresh(record)
            return record.id
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_person(self, person_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a person by their ID."""
        session = self.get_session()
        try:
            p = session.query(Person).filter(Person.person_id == person_id).first()
            if not p:
                return None
            return {
                "person_id": p.person_id,
                "name": p.name,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "image_count": p.image_count,
            }
        finally:
            session.close()

    def list_persons(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieves all persons in the database."""
        session = self.get_session()
        try:
            query = session.query(Person)
            if user_id:
                query = query.filter(Person.user_id == user_id)
            persons = query.all()
            return [
                {
                    "person_id": p.person_id,
                    "name": p.name,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                    "image_count": p.image_count,
                }
                for p in persons
            ]
        finally:
            session.close()

    def delete_person(self, person_id: str, user_id: Optional[int] = None) -> bool:
        """Deletes a person and their embedding records."""
        session = self.get_session()
        try:
            person = session.query(Person).filter(Person.person_id == person_id).first()
            if not person:
                return False
            name = person.name
            session.delete(person)
            session.commit()

            self.log_audit(user_id, "PERSON_DELETED", details=f"Removed identity {name} ({person_id})")
            return True
        except Exception:
            session.rollback()
            return False
        finally:
            session.close()

    def get_person_by_faiss_idx(self, faiss_idx: int) -> Optional[Dict[str, Any]]:
        """Looks up a person by FAISS index."""
        session = self.get_session()
        try:
            record = session.query(EmbeddingRecord).filter(EmbeddingRecord.faiss_idx == faiss_idx).first()
            if not record or not record.person:
                return None
            p = record.person
            return {
                "person_id": p.person_id,
                "name": p.name,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "image_count": p.image_count,
            }
        finally:
            session.close()

    def get_embedding_records_for_person(self, person_id: str) -> List[Dict[str, Any]]:
        """Retrieves all embedding records for a given person."""
        session = self.get_session()
        try:
            records = session.query(EmbeddingRecord).filter(EmbeddingRecord.person_id == person_id).all()
            return [
                {
                    "id": r.id,
                    "person_id": r.person_id,
                    "faiss_idx": r.faiss_idx,
                    "image_name": r.image_name,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in records
            ]
        finally:
            session.close()

    def get_all_faiss_indices_for_person(self, person_id: str) -> List[int]:
        """Retrieves all FAISS indices associated with a person."""
        session = self.get_session()
        try:
            records = session.query(EmbeddingRecord.faiss_idx).filter(EmbeddingRecord.person_id == person_id).all()
            return [r[0] for r in records]
        finally:
            session.close()

    def close(self):
        """Closes all database connections."""
        if self.SessionFactory:
            self.SessionFactory.remove()
        if self.engine:
            self.engine.dispose()
